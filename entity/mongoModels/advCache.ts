///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');

import {Document, Schema, model} from 'mongoose'

// 1) CLASS
export class AdvCache {
    _id:any;
    campaignId:string;
    reserveSum:number;
    cache:string[];
    wallet:number;

    constructor(data:{campaignId:string, reserveSum: number, cache:string[], wallet:number}) {
        this.campaignId = data.campaignId;
        this.reserveSum = data.reserveSum;
        this.cache = data.cache; 
        this.wallet = data.wallet;
    }
}

// no necessary to export the userSchema (keep it private to the module)
var schema = new Schema({
    wallet: Number,
    campaignId: String,
    reserveSum: Number,
    cache: [String]

});
export interface AdvCacheDocument extends AdvCache, Document {
}

// 3) MODEL
export const AdvCaches = model<AdvCacheDocument>('advCache', schema);

