import {hashSync} from "bcrypt";
import {HttpResponse} from "uWebSockets.js";
import {IMessage} from "../messages";

export type Encoding = "utf-8" | "utf-16" | "utf-32";

export const decode = (data: ArrayBuffer, encoding: Encoding): IMessage => {
    let buffer;
    switch(encoding) {
        case "utf-8":
            buffer = new Uint8Array(data);
            break;
        case "utf-16":
            buffer = new Uint16Array(data);
            break;
        case "utf-32":
            buffer = new Uint32Array(data);
            break;
        default:
            buffer = null;
    }

    if(buffer === null)
        return null;
    
    const parsed = JSON.parse(String.fromCharCode.apply(null, buffer));

    if(!parsed.action || !parsed.payload)
        return null;

    return parsed;
};

export const generateKey = (): string => {
    return `sk_${Math.random().toString(36).substring(2, 8)}:${Math.random().toString(36).substring(4, 20)}${Math.random().toString(36).substring(8, 16)}`
}

export const hashPassword = (pw: string) => {
    return hashSync(pw, 12);
}

export function parseQueryString(query: string): { [key: string]: any; } {
    return JSON.parse('{"' + query.replace(/&/g, '","').replace(/=/g, '":"') + '"}', function (key, value) {
        return key === "" ? value : decodeURIComponent(value)
    });
}

export function readJson<T> (res: HttpResponse, cb, err) {
    let buffer: Buffer;
    res.onData((ab: ArrayBuffer, isLast: boolean) => {
      let chunk: Buffer = Buffer.from(ab);
      if (isLast) {
        let json;
        if (buffer) {
          try {
            json = JSON.parse(Buffer.concat([buffer, chunk]).toString());
          } catch (e) {
            res.close();
            return;
          }
          cb(<T> json);
        } else {
          try {
            json = JSON.parse(chunk.toString());
          } catch (e) {
            res.close();
            return;
          }
          cb(<T> json);
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });
  
    res.onAborted(err);
  }