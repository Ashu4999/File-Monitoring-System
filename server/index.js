const express = require("express");
const app = express();
const PORT = 5000;
const fs = require("fs");
const ftShowLineLimit = 11;
const { v4: uuidv4 } = require('uuid');
const { Server } = require("socket.io");
var cors = require('cors');
const crypto = require('crypto');
const connectedClient = {};

function createHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

app.use(cors());
app.get("/", (req, res) => {
    return res.send("Home");
});

app.get("/log", async (req, res) => {
    try {
        let { userID } = req.query;
        let fileContent = await fs.readFileSync("/home/ashutosh/Learning/sockets/File Monitoring System/test.txt", "utf-8");
        let lines = fileContent.split("\n");
        let startingLineNo = lines.length - ftShowLineLimit;
        let response = lines.slice(-ftShowLineLimit).join("\n");
        let contentHash = createHash(response);
        connectedClient[userID] = { startLineNo: startingLineNo >= 0 ? startingLineNo : 0, currentLineNo: lines.length, contentHash };
        console.log(connectedClient);
        return res.send(response);
    } catch (Exception) {
        console.log(Exception);
        return res.json({ message: "Something went wrong"});
    }
});

const expressServer = app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});

const io = new Server(expressServer, {
    cors: {
        origin: "*"
    }
});

const serverSocket = io.on("connection", socket => {
    console.log(`User ${socket.id} connected`);

    //When user disconnects
    socket.on("disconnect", () => {
        delete connectedClient[socket.id];
        console.log(`User ${socket.id} disconnected`);
    })
});

fs.watch("../test.txt", async (eventType, filename) => {
    let fileContent = await fs.readFileSync("/home/ashutosh/Learning/sockets/File Monitoring System/test.txt", "utf-8");
    let lines = fileContent.split("\n");

    if (lines[0] === "" && lines.length === 1) {
     return;
    }
    // console.log("HERE fs.watch Conneted Client", Object.keys(connectedClient))
    let clientIDs = Object.keys(connectedClient);
    if (clientIDs.length) {
        clientIDs.forEach(clientID => {
            let changedContent = lines.slice(connectedClient[clientID].currentLineNo, lines.length);
            let previousContent = lines.slice(connectedClient[clientID].startLineNo, connectedClient[clientID].currentLineNo);
            let previousContentHash = createHash(previousContent.join("\n"));
            // console.log("HERE previousContentHash", previousContentHash, previousContent.length)
            if (previousContentHash !== connectedClient[clientID].contentHash) {
                console.log("HERE Content Changed");
                serverSocket.to(clientID).emit("prev-file-update", previousContent.join("\n"));  
                connectedClient[clientID].contentHash = previousContentHash;
            }
            // console.log(previousContent.join("\n"));
            // console.log("Here previousContent", createHash(previousContent));
            if (changedContent.length) {
                console.log("Line Update");
                //added "" black space at first element to add new line at starting
                serverSocket.to(clientID).emit("file-update", ["", ...changedContent].join("\n"));  
                connectedClient[clientID].currentLineNo = lines.length;
            }   
        });
    }
});