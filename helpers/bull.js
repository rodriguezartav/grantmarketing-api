const bullmp = require("bullmq");
const { Queue, QueueEvents } = bullmp;
const fs = require("fs");
const path = require("path");

var express = require("express");
var router = express.Router();

const ApiQueue = new Queue("API", {
  connection: {
    user: "h",
    password:
      "p4ff53073a44f07221cbd417d55f1a68507a86bfff703e0ce69e3be971338d55d",
    host: "ec2-174-129-162-204.compute-1.amazonaws.com",
    port: 14499,
  },
});

const ApiEvents = new QueueEvents("API", {
  connection: {
    user: "h",
    password:
      "p4ff53073a44f07221cbd417d55f1a68507a86bfff703e0ce69e3be971338d55d",
    host: "ec2-174-129-162-204.compute-1.amazonaws.com",
    port: 14499,
  },
});

queueEvents.on("waiting", ({ jobId }) => {
  console.log(`A job with ID ${jobId} is waiting`);
});

queueEvents.on("active", ({ jobId, prev }) => {
  console.log(`Job ${jobId} is now active; previous status was ${prev}`);
});

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`${jobId} has completed and returned ${returnvalue}`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`${jobId} has failed with reason ${failedReason}`);
});

module.exports = {
  API: ApiQueue,
};
