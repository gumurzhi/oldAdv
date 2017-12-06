///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');

import {Document, Schema, model} from 'mongoose'

export interface paymertIface{
    _id?: any;
    payer:string;
    provider: string;
    sum: number;
    payDate?: Date;
}
export class Payment implements paymertIface{
    _id: any;
    payer:string;
    provider: string;
    sum: number;
    payDate: Date;
    constructor(data:{payer:string, sum: number, provider: string, payDate:Date}) {
        this.payer = data.payer;
        this.provider = data.provider;
        this.sum = data.sum;
        this.payDate = data.payDate;
        
    }
}

var schema = new Schema({
    payer: String,
    sum: Number,
    provider: String,
    payDate: Date
});
export interface PaymentDocument extends Payment, Document {
}

export const Payments = model<PaymentDocument>('payments', schema);

