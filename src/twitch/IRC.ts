interface Tags {
    [t: string]: string | null;
}

interface Prefix {
    nickname?: string;
    user?: string;
    server?: string;
}

export interface IrcMessage {
    tags?: Tags;
    prefix?: Prefix;
    command: string;
    params: string[];
    // If the first param begins with `#`, it is moved to channel instead.
    channel?: string;
}

function findOrEnd(str: string, ch: string, min: number = 0, max: number = -1):
    number {
    if (max === -1) { max = str.length; }
    if (min >= max) { return max; }
    const pos = str.indexOf(ch, min);
    return pos >= 0 && pos < max ? pos : max;
}

function unescapeTagValue(value: string) {
    // Assume no escaped backslashes. It makes things easier and is probably
    // safe for things coming from twitch.
    return value.replace('\\;', ';').replace('\\s', ' ').replace('\\r', '\r')
        .replace('\\n', '\n');
}

function parseTags(message: string, i: number, end: number) {
    const tags: { [t: string]: string | null; } = {};
    let tagEnd;
    for (let tagStart = i + 1; tagStart < end; tagStart = tagEnd + 1) {
        const valuePos = findOrEnd(message, '=', tagStart, end);
        do { tagEnd = findOrEnd(message, ';', valuePos + 1, end); }
        while (message[tagEnd - 1] === '\\');
        tags[message.substring(tagStart, valuePos)] = valuePos < tagEnd
            ? unescapeTagValue(message.substring(valuePos + 1, tagEnd))
            : null;
    }
    return tags;
}

function parsePrefix(message: string, i: number, end: number) {
    const prefix: {
        nickname?: string,
        user?: string,
        server?: string,
    } = {};
    const hostMark = findOrEnd(message, '@', i + 1, end);
    const userMark = findOrEnd(message, '!', i + 1, hostMark);
    if (userMark === end) {
        // No host or user marker, so this is either a raw nickname or a server
        // host. Servers could be identified by domain name (contains dots),
        // IPv4 (contains dots), or IPv6 (contains colons).
        if (findOrEnd(message, '.', i + 1, end) !== end ||
            findOrEnd(message, ':', i + 1, end) !== end) {
            prefix.server = message.substring(i + 1, end);
        } else {
            prefix.nickname = message.substring(i + 1, end);
        }
    } else {
        // A nickname followed by an optional user and an optional host.
        prefix.nickname = message.substring(i + 1, userMark);
        if (userMark !== hostMark) {
            prefix.user = message.substring(userMark + 1, hostMark);
        } else {
            prefix.user = prefix.nickname;
        }
        if (hostMark !== end) {
            prefix.server = message.substring(hostMark + 1, end);
        }
    }
    return prefix;
}

export function parseMessage(message: string): IrcMessage {
    // IRC message format:
    // [@tags] [:prefix] command [params...]
    // If a param begins with `:` it covers all trailing words.
    let i = 0;
    const parsed: IrcMessage = { command: '', params: [] };
    if (message[i] === '@') {
        const end = findOrEnd(message, ' ', i + 1);
        parsed.tags = parseTags(message, i, end);
        i = end + 1;
    }
    if (message[i] === ':') {
        const end = findOrEnd(message, ' ', i + 1);
        parsed.prefix = parsePrefix(message, i, end);
        i = end + 1;
    }
    {
        const commandEnd = findOrEnd(message, ' ', i);
        parsed.command = message.substring(i, commandEnd);
        i = commandEnd + 1;
    }
    {
        parsed.params = [];
        while (i < message.length) {
            if (message[i] === ':') {
                parsed.params.push(message.substring(i));
                break;
            }
            const end = findOrEnd(message, ' ', i);
            parsed.params.push(message.substring(i, end));
            i = end + 1;
        }
        if (parsed.params.length > 0 && parsed.params[0][0] === '#') {
            parsed.channel = parsed.params.shift();
        }
    }
    return parsed;
}
