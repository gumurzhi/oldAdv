///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');

import {Document, Schema, model} from 'mongoose'

// 1) CLASS
export class Platform {
    _id: any;
    platformName:string;
    imgLink: string;

    constructor(data:{platformName:string, imgLink: string}) {
        this.platformName = data.platformName;
        this.imgLink = data.imgLink;
        
    }
}

var schema = new Schema({
    platformName: String,
    imgLink: String
});
export interface PlatformDocument extends Platform, Document {
}

export const Platforms = model<PlatformDocument>('platforms', schema);

