/** Copyright © 2016-2018, Okta, Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

let express = require('express');
let app = express();

let url = require('url');
let bodyParser = require('body-parser');

let scimCore = require('./core/SCIMCore');
let db = require('./core/Database');

let user = require('./models/User');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/scim/v2/Users', function (req, res) {
    let urlParts = url.parse(req.url, true);
    let reqUrl = urlParts.pathname;
    let requestBody = "";

    req.on('data', function (data) {
        requestBody += data;
        let userJsonData = JSON.parse(requestBody);
        let userModel = user.createUser(userJsonData);

        db.createUser(userModel, reqUrl, function (result) {
            if (result["status"] !== undefined) {
                if (result["status"] === "400") {
                    res.writeHead(400, {"Content-Type": "text/plain"});
                } else if (result["status"] === "409") {
                    res.writeHead(409, {"Content-Type": "text/plain"});
                }
            } else {
                res.writeHead(201, {"Content-Type": "text/json"});
            }

            res.end(JSON.stringify(result));
        });
    });
});

app.get('/scim/v2/Users', function (req, res) {
    let urlParts = url.parse(req.url, true);
    let reqUrl = urlParts.pathname;

    let query = urlParts.query;
    let startIndex = query["startIndex"];
    let count = query["count"];
    let filter = query["filter"];

    if (filter !== undefined) {
        let attributeName = String(filter.split("eq")[0]).trim();
        let attributeValue = String(filter.split("eq")[1]).trim();

        db.getFilteredUsers(attributeName, attributeValue, startIndex, count, reqUrl, function (result) {
            if (result["status"] !== undefined) {
                if (result["status"] === "400") {
                    res.writeHead(400, {"Content-Type": "text/plain"});
                } else if (result["status"] === "409") {
                    res.writeHead(409, {"Content-Type": "text/plain"});
                }
            } else {
                res.writeHead(200, {"Content-Type": "text/json"});
            }

            res.end(JSON.stringify(result));
        });
    } else {
        db.getAllUsers(startIndex, count, reqUrl, function (result) {
            if (result["status"] !== undefined) {
                if (result["status"] === "400") {
                    res.writeHead(400, {"Content-Type": "text/plain"});
                } else if (result["status"] === "409") {
                    res.writeHead(409, {"Content-Type": "text/plain"});
                }
            } else {
                res.writeHead(200, {"Content-Type": "text/json"});
            }

            res.end(JSON.stringify(result));
        });
    }
});

app.get('/scim/v2/Users/:userId', function (req, res) {
    let reqUrl = req.url;

    let userId = req.params.userId;

    db.getUser(userId, reqUrl, function (result) {
        if (result["status"] !== undefined) {
            if (result["status"] === "400") {
                res.writeHead(400, {"Content-Type": "text/plain"});
            } else if (result["status"] === "409") {
                res.writeHead(409, {"Content-Type": "text/plain"});
            }
        } else {
            res.writeHead(200, {"Content-Type": "text/json"});
        }

        res.end(JSON.stringify(result));
    });
});

app.patch('/scim/v2/Users/:userId', function (req, res) {
    let urlParts = url.parse(req.url, true);
    let reqUrl = urlParts.pathname;

    let userId = req.params.userId;

    let requestBody = "";

    req.on("data", function (data) {
        requestBody += data;
        let jsonReqBody = JSON.parse(requestBody);
        let operation = jsonReqBody["Operations"][0]["op"];
        let value = jsonReqBody["Operations"][0]["value"];
        let attribute = Object.keys(value)[0];
        let attributeValue = value[attribute];

        if (operation === "replace") {
            db.patchUser(attribute, attributeValue, userId, reqUrl, function (result) {
                if (result["status"] !== undefined) {
                    if (result["status"] === "400") {
                        res.writeHead(400, {"Content-Type": "text/plain"});
                    } else if (result["status"] === "409") {
                        res.writeHead(409, {"Content-Type": "text/plain"});
                    }
                } else {
                    res.writeHead(200, {"Content-Type": "text/json"});
                }

                res.end(JSON.stringify(result));
            });
        } else {
            let scimError = scimCore.createSCIMError("Operation Not Supported", "403");
            res.writeHead(403, {"Content-Type": "text/plain"});
            res.end(JSON.stringify(scimError));
        }
    });
});

app.put('/scim/v2/Users/:userId', function (req, res) {
    let urlParts = url.parse(req.url, true);
    let reqUrl = urlParts.pathname;

    let userId = req.params.userId;

    let requestBody = "";

    req.on("data", function (data) {
        requestBody += data;
        let userJsonData = JSON.parse(requestBody);
        let userModel = user.createUser(userJsonData);

        db.updateUser(userModel, userId, reqUrl, function (result) {
            if (result["status"] !== undefined) {
                if (result["status"] === "400") {
                    res.writeHead(400, {"Content-Type": "text/plain"});
                } else if (result["status"] === "409") {
                    res.writeHead(409, {"Content-Type": "text/plain"});
                }
            } else {
                res.writeHead(200, {"Content-Type": "text/json"});
            }

            res.end(JSON.stringify(result));
        });
    });
});

app.get('/scim/v2', function (req, res) {
    res.send('SCIM');
});

let server = app.listen(8081, function () {
    db.dbInit();
});