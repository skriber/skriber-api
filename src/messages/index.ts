export interface IMessage {
    type: "subscribe" | "subscribed" | "unsubscribe" | "unsubscribed" | "event" | "challenge" | "welcome" | "error" | "ping" | "pong",
    payload?: object | string | null | undefined;
};

export interface SubscribeMessage extends IMessage {
    type: "subscribe",
    payload: {
        channel: string
    }
};

export interface SubscribedMessage extends IMessage {
    type: "subscribed",
    payload: {
        channel: string
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
        event: string,
        data: any
    }
}

export interface PingMessage extends IMessage {
    type: "ping"
};

export interface PongMessage extends IMessage {
    type: "pong"
};