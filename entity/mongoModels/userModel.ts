///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');
import bcrypt = require('bcrypt-nodejs');

import {Document, Schema, model} from "mongoose";
export interface userProfileIface {
    logo:string;
    name:string;
    phone: string;
    url:string;
    email:string;
    company:string;
    location:string;
    disable_notifications:boolean
}

export interface userIface {
    _id?:any;
    wallet: number;
    username:string;
    password:string;
    profile:userProfileIface;
}

// 1) CLASS
export class User implements userIface {
    _id:any;
    username:string;
    password:string;
    profile:{
        logo:string;
        name:string;
        phone:string;
        url:string;
        email:string;
        company:string;
        location:string;
        disable_notifications:boolean

    };

    wallet:number;

    constructor(data:{username:string, password:string, wallet:number, profile:{
        logo:string,
        name:string,
        phone:string,
        url:string,
        email:string,
        company:string,
        location:string,
        disable_notifications:boolean
    }}) {
        this.password = data.password;
        this.username = data.username;
        this.wallet = data.wallet;
        this.profile = data.profile;
    }

    /* any method would be defined here*/
    generateHash(password:string):string {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
    }

    validPassword(password:string) {
        return bcrypt.compareSync(password, this.password);
    };
}

// no necessary to export the userSchema (keep it private to the module)
var userSchema = new Schema({
    password: {required: true, type: String},
    username: {required: true, type: String, unique: true},
    wallet: Number,
    profile: {
        logo: String,
        name: String,
        phone: String,
        url: String,
        email: String,
        company: String,
        location: String,
        disable_notifications: Boolean
    }
});
// register each method at userSchema
userSchema.method('generateHash', User.prototype.generateHash);
userSchema.method('validPassword', User.prototype.validPassword);
// 2) Document
export interface UserDocument extends User, Document {
}

// 3) MODEL
export const Users = model<UserDocument>('users', userSchema);

