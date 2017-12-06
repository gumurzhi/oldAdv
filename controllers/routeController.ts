///<reference path="../typings/tsd.d.ts"/>
import * as express from 'express';
import {routes} from '../entity/routes';

export function routeController(app:any) {
    routes.forEach(function (route) {
        if (route && route.authToUse) {
            route.middleware.unshift(isLoggedIn);
        }
        var args = flatten([route.path, route.middleware]);
        switch (route.httpMethod.toUpperCase()) {
            case 'GET':
                app.get.apply(app, args);
                break;
            case 'POST':
                app.post.apply(app, args);
                break;
            default:
                throw new Error('Invalid HTTP method specified for route ' + route.path);
            //break;
        }
    })
}


function isLoggedIn(req:express.Request, res:express.Response, next:any) {
    /** todo remove this line!!!! */
    //  return next();
    // if userModel is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        return next();
    }
    res.json({error: 'not authenticated'});
    // if they aren't redirect them to the home page
    // res.redirect('/login');

}

function flatten(arr:Array<any>):Array<any> {
    const flat = [].concat(...arr);
    return flat.some(Array.isArray) ? flatten(flat) : flat;
}