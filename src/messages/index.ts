export type Message = "subscribe" | "presence_join" | "presence_leave" | "presence_info" | "subscribed" | "unsubscribe" | "unsubscribed" | "event" | "challenge" | "welcome" | "error" | "ping" | "pong";

export interface IMessage {
    type: Message,
    payload?: object | string | null | undefined;
};

export interface SubscribeMessage extends IMessage {
    type: "subscribe",
    payload: {
        channel: string,
        signature?: string,
        data?: any
    }
};

export interface PresenceJoinMessage extends IMessage {
    type: "presence_join",
    payload: {
        channel: string,
        data?: any
    }
};

export interface PresenceLeaveMessage extends IMessage {
    type: "presence_leave",
    payload: {
        channel: string,
        data?: any
    }
};

export interface PresenceInfoMessage extends IMessage {
    type: "presence_info",
    payload: {
        channel: string,
        data?: any
    }
};

export interface SubscribedMessage extends IMessage {
    type: "subscribed",
    payload: {
        channel: string,
        data?: any
    }
};

export interface UnsubscribeMessage extends IMessage {
    type: "unsubscribe",
    payload: {
        channel: string
    }
};

export interface UnsubscribedMessage extends IMessage {
    type: "unsubscribed",
    payload: {
        channel: string
    }
};

export interface ErrorMessage extends IMessage {
    type: "error",
    payload: {
        error: string
    }
};

export interface WelcomeMessage extends IMessage {
    type: "welcome",
    payload: {
        socket: string
    }
};

export interface ChallengeMessage extends IMessage {
    type: "challenge",
    payload: {
        application: string,
        publicKey: string
    }
};

export interface EventMessage extends IMessage {
    type: "event",
    payload: {
        channel: string,
        data: any
    }
}

export interface PingMessage extends IMessage {
    type: "ping"
};

export interface PongMessage extends IMessage {
    type: "pong"
};