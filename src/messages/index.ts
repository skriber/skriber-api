export type Message = "connection_established" | "subscribe" | "subscription_success" | "unsubscribe" | "event" | "error" | "ping" | "pong";

export interface IMessage {
    type: Message;
    payload?: object | string | null | undefined;
}


// ===============================================================
// Client Messages
// ===============================================================

export interface SubscribeMessage extends IMessage {
    type: "subscribe";
    payload: {
        channel: string;
        signature?: string;
    }
}

export interface UnsubscribeMessage extends IMessage {
    type: "unsubscribe";
    payload: {
        channel: string;
    }
}

// ===============================================================
// Server Messages
// ===============================================================

export interface ConnectionEstablishedMessage extends IMessage {
    type: "connection_established";
    payload: {
        socketId: string;
    }
}

export interface SubscriptionSuccessMessage extends IMessage {
    type: "subscription_success";
    payload: {
        channel: string;
    }
}

export interface ErrorMessage extends IMessage {
    type: "error";
    payload: {
        error: string;
    }
}

export interface EventMessage extends IMessage {
    type: "event";
    payload: {
        channel: string;
        data: any;
    }
}

export interface PingMessage extends IMessage {
    type: "ping";
}

export interface PongMessage extends IMessage {
    type: "pong";
}