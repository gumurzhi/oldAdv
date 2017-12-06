///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');

import {Document, Schema, model} from 'mongoose'

// 1) CLASS
export class Abuse {
    _id: any;
    subject:string;
    message: string;
    userId: string;

    constructor(data:{subject:string, message: string, userId:string}) {
        this.subject = data.subject;
        this.message = data.message;
        this.userId = data.userId;
        
    }
}

var schema = new Schema({
    subject: String,
    message: String,
    userId: String
});
export interface AbuseDocument extends Abuse, Document {
}

export const Abuses = model<AbuseDocument>('abuses', schema);

