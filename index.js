console.log("\n---------------[ FoodRate Server ]---------------\n");


const config = require("./config");
const express = require("express");
const firebase = require("firebase");
require("firebase/firestore");

const app = express();

app.listen(config.server.port, () => console.log(`Listening on port: ${config.server.port}`));

firebase.initializeApp(config.firebase);

const db = firebase.firestore();


/**
 * @param {String} collection 
 */
function getCollection(collection) {
    return new Promise(resolve => {
        db.collection(collection).get().then(querySnapshot => {
            let result = [];
            querySnapshot.forEach(doc => {
                let document = doc.data();
                document['id'] = doc.id;
                result.push(document);
            });
            resolve(result)
        });
    });
}

/**
 * @param {String} collection
 * @param {String} field
 * @param {*} value
 */
function getDocsByFieldValue(collection, field, value) {
    return new Promise(resolve => {

        db.collection(collection).where(field, "==", value).get().then(querySnapshot => {
            let result = [];
            querySnapshot.forEach(doc => {
                let document = doc.data();
                document['id'] = doc.id;
                result.push(document);
            });
            resolve(result)
        });
    });
}

getUserByAppId = async (appId) => {
    let result;
    let users = await getDocsByFieldValue("users", "app_id", appId);
    if (users) result = users[0];
    else result = false;

    return result;
}

getLatestRatingByUserId = async (userId) => {
    let result;
    let userRatings = await getDocsByFieldValue("ratings", "author_id", userId);
    if (userRatings.length > 0) result = userRatings.sort((a, b) => (a.timestamp.seconds < b.timestamp.seconds) ? 1 : -1)[0];
    else if (userRatings.length == 0) result = "never";
    else result = false;
    return result;
}

getFoodMenuByWeek = async (week) => {
    let result
    result = await getDocsByFieldValue("foodMenu", "week", week);
    if (!result) result = false;
    return result;
}


app.get('/test', async (req, res) => {
    logIncomingRequest(req);
    let result = await db.get();
    console.log(result)
    //new SuccessResponse(res, "Test Message", result);
});


/*Client Requests*/

app.post('/rate', async (req, res) => {
    logIncomingRequest(req);

    let expectedParams = {
        app_id: new String(),
        rating: new Number()
    }

    for (let param in expectedParams) if (req.query[param] === undefined) {
        new ErrorResponse(res, `Missing required parameter "${param}"`); return;
    }


    let user = await getUserByAppId(req.query.app_id)
    if (!user) new ErrorResponse(res, "Could not validate user");
    let latestRating = await getLatestRatingByUserId(user.id)
    if (!latestRating) new ErrorResponse(res, "Could not get lastest rating");

    let userHasRated = false;
    if (latestRating !== "never") {
        let now = new Date();
        let latestTime = new Date()
        latestTime.setTime(latestRating.timestamp.seconds * 1000)

        if (latestTime.toDateString() == now.toDateString()) userHasRated = true;
    }


    if (userHasRated && false) new ErrorResponse(res, "User has already submitted a rating today.")
    else {

        let newRating = {
            author_id: user.id,
            timestamp: new Date(),
            rating: req.query.rating,
        };

        if (req.query.comment) {
            newRating.comment = req.query.comment
            newRating.has_told_staff = req.query.has_told_staff
        }

        let dbResponse = await db.collection("ratings").add(newRating);

        if (!dbResponse) new ErrorResponse(res, "Failed to add rating to database");

        new SuccessResponse(res, "Rating Successful");
    }
});

app.post('/comment', async (req, res) => {
    logIncomingRequest(req);
    let user = await getUserByAppId(req.query.app_id)
    if (!user) {
        new ErrorResponse(res, "Could not validate user");
        return;
    }
    let latestRating = await getLatestRatingByUserId(user.id)
    if (!latestRating) {
        new ErrorResponse(res, "Could not get lastest rating");
        return;
    }

    let updatedRating = {
        author_id: latestRating.author_id,
        rating: latestRating.rating,
        timestamp: latestRating.timestamp,
        comment: req.query.comment
    }

    console.log("Updated Rating", updatedRating);

    await db.collection("ratings").doc(latestRating.id).set(updatedRating);

    new SuccessResponse(res, "Comment successful");
});

app.get('/fetch_menu', async (req, res) => {
    logIncomingRequest(req);
    let foodMenu = await getFoodMenuByWeek(JSON.parse(req.query.week));
    if (!foodMenu) new ErrorResponse(res, "Could not get menu");

    new SuccessResponse(res, "Menu fetch successful", foodMenu);
});

app.post('/user_register', (req, res) => {
    logIncomingRequest(req);
    res.send('nice');
});


/*Admin Requests*/

app.post('/generate_key', (req, res) => {
    logIncomingRequest(req);
    res.send('nice');
});


app.get('/admin_fetch_data', async (req, res) => {
    logIncomingRequest(req);

    res.set('Access-Control-Allow-Origin', 'https://te4umea2019.github.io')
    if (req.query.admin_key !== config.admin.token) {
        new ErrorResponse(res, "Invalid admin key");
        return;
    }

    let users = await getCollection("users");
    let ratings = await getCollection("ratings");
    let comments = await getCollection("comments");
    let foodMenu = await getCollection("foodMenu");
    let data = {
        users: users,
        ratings: ratings,
        comments: comments,
        foodMenu: foodMenu
    }

    new SuccessResponse(res, "Data fetch successful", data);
})

logIncomingRequest = (req) => {
    console.log("->", req.route.path, req.query, req.originalUrl);
}

class Response {
    constructor(res, message, status, params) {
        this.message = message;
        this.status = status;
        for (let property in params) this[property] = params[property];

        res.send(this);
        console.log("<-", this);
        return this;
    }
}

class SuccessResponse extends Response {
    constructor(res, message, params) {
        super(res, message, "success", params);
    }
}

class ErrorResponse extends Response {
    constructor(res, message, params) {
        super(res, message, "error", params);
    }
}