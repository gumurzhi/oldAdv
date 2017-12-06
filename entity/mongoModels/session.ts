///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');

import {Document, Schema, model} from "mongoose";

export interface sessionIface {
    _id:string;
    session:{cookie:{originalMaxAge:number,
        expires:Date,
        httpOnly:boolean,
        path:string},
        passport:{user:string}},
    expires:Date;
}
export class Session {
    _id:any;
    session:string;
    expires:Date;

    constructor(data:{session:string, expires:Date}) {
        this.session = data.session;
        this.expires = data.expires;
    }
}

var schema = new Schema({
    _id: String,
    session: String,
    passport: {user: String},
    expires: Date
});
export interface SessionDocument extends Session, Document {
}

export const Sessioins = model<SessionDocument>('sessions', schema);

