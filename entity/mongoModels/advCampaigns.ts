///<reference path="../../typings/tsd.d.ts"/>
import mongoose = require('mongoose');
import {Document, Schema, model} from 'mongoose'

interface imgIface {
    img:string
}
// 1) CLASS
export interface AdvCampaignIface{
    _id?:any;
    chargeBudget?:number;
    title?:string;
    description?:string;
    owner?:string;  //owner's Id
    logo?: string;
    btnColor?: string;
    budget?:number;
    dayBudget?:number;
    status?:string;   //   started | paused | finished | pending
    banner?:string;
    startDate?:string;
    endDate?:string;
    vert_img?:string;
    horz_img?:string;
    btnTxt?:string;
    price?:{
        banner:number;
        vert_img:number;
        horz_img:number;
        action:number;
    };
    targeting?:{
        age?:string[];
        gender?:string;
        country?:string[];
        appType?:string;
    };
    action?:{
        actionType:string;
        data:string;
    };
    statistic?: any
}



export class AdvCampaign implements AdvCampaignIface{
    _id:any;
    title:string;
    description:string;
    owner:string;  //owner's Id
    logo: string;
    btnColor: string;
    budget:number;
    dayBudget:number;
    status:string;   //   started | paused | finished | pending
    banner:string;
    startDate:string;
    endDate:string;
    vert_img:string;
    horz_img:string;
    btnTxt:string;
    price:{
        banner:number;
        vert_img:number;
        horz_img:number;
        action:number;
    };
    targeting:{
        age:string[];
        gender:string;
        country:string[];
        appType:string;
    };
    action:{
        actionType:string;
        data:string;
    };

    statistic:{appType: string, platformName:string, age:string, gender:string, country:string, banner:boolean, vert_img:boolean, horz_img:boolean, action:number, totalCost:number, cDate: Date}[];

    constructor(data:{owner:string,
        budget:number,
        dayBudget:number,
        title:string,
        description:string,
        logo: string,
        btnColor: string,
        startDate:string,
        endDate:string,
        status:string,
        banner: string,
        vert_img:string,
        horz_img: string,
        btnTxt:string,
        price:{
            banner:number,
            vert_img:number,
            horz_img:number,
            action:number
        },
        targeting:{
            age:string[],
            gender:string,
            country:string[],
            appType: string
        }
        action:{
            actionType:string,
            data:string
        },
        statistic:{appType: string, platformName:string, age:string, gender:string, country:string, banner:boolean, vert_img:boolean, horz_img:boolean, action:number, totalCost:number, cDate: Date}[]
    }) {
        this.owner = data.owner;
        this.description = data.description;
        this.title = data.title;
        this.logo = data.logo;
        this.budget = data.budget;
        this.btnColor = data.btnColor;
        this.dayBudget = data.dayBudget;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.status = data.status;
        this.banner = data.banner;
        this.vert_img = data.vert_img;
        this.horz_img = data.horz_img;
        this.btnTxt = data.btnTxt;
        this.price = data.price;
        this.targeting = data.targeting;
        this.statistic = data.statistic;
        this.action = data.action;

    }
}


// no necessary to export the userSchema (keep it private to the module)
var schema = new Schema({
    owner: String,
    budget: Number,
    logo: String,
    btnColor: String,
    title: String,
    description: String,
    dayBudget: Number,
    status: String,
    startDate: Date,
    endDate: Date,
    banner: String,
    vert_img: String,
    horz_img: String,
    btnTxt: String,
    price: {
        banner: Number,
        vert_img: Number,
        horz_img: Number,
        action: Number
    },
    targeting: {
        age: [String],
        gender: String,
        country: [String],
        appType: String
    },
    action: {
        actionType: String,
        data: String
    },
    statistic: [{
        appType: String, 
        platformName:String,
        age: String,
        gender: String,
        country: String,
        banner: Boolean,
        vert_img: Boolean,
        horz_img: Boolean,
        action: Number,
        totalCost: Number,
        cDate: Date
    }]

});

// register each method at userSchema
// userSchema.method('generateHash', User.prototype.generateHash);
// userSchema.method('validPassword', User.prototype.validPassword);
// 2) Document
export interface AdvDocument extends AdvCampaign, Document {
}

// 3) MODEL
export const AdvCampaigns = model<AdvDocument>('advCampaigns', schema);

