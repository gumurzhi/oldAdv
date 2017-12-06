import {userController} from "../controllers/userController";

var user = {
    username: 'v.tokaryev',
    wallet: 0,
    password: 'fdG47@9jQ',
    profile: {
        logo: '',
        name: '',
        url: '',
        email: '',
        company: '',
        location: '',
        disable_notifications: false

    }
};

userController.createNewUser(user)
    .then(function (createdUser) {
        console.log('user successfully created:', createdUser);
    })
    .catch(function (err) {
        console.log(err);
    });
