const pikudHaoref = require('pikud-haoref-api');
const NodeCache = require("node-cache");
const fs = require('fs');

const {SESv2Client, SendEmailCommand} = require('@aws-sdk/client-sesv2');
const awsKeys = require('./aws.json');
const client = new SESv2Client({
	region: awsKeys.region,
	credentials: { accessKeyId: awsKeys.accessKey, secretAccessKey: awsKeys.secretKey },
	//credentials: { accessKeyId: 'ANY_STRING
	});
if(awsKeys.uptimePingURL=="https://hc-ping.com/****-***-***-****-********") {
	awsKeys.uptimePingURL=null; //disable demo URL
	console.log('Disabling default uptimePingURL, please set your own URL in aws.json if you want this feature. Sign up at https://healthchecks.io/');
	}

// Set polling interval in millis
var interval = 5  /*seconds*/ * 1000 /*ms*/;

const DEDUPLICATION_COOLDOWN_SECONDS = 5 * 60; // 5 minutes
// Create a new cache instance.
// stdTTL (Standard Time To Live): The default lifetime for each cache entry in seconds.
// After 5 minutes, the entry for an alert will be automatically deleted.
const sentAlertsCache = new NodeCache({ stdTTL: DEDUPLICATION_COOLDOWN_SECONDS });
const uptimeAlertsHourly = new NodeCache({ stdTTL: 60*60 }); // 1 hour


async function sendEmail(email){
	const input = {
		FromEmailAddress: awsKeys.from,
		Destination: { // Destination
			ToAddresses: awsKeys.to,
			CcAddresses: awsKeys.cc},
		Content: {
			Simple: {
				Subject: { Data: email.subject },
				Body: { Text: { Data: email.body }}
			}
			}
		}
	const command = new SendEmailCommand(input);
	const response = await client.send(command);
	console.log(response);
	return response;
	}

const startTime = new Date();
var i=0;
// Define polling function
var poll = function () {
    // Optional Israeli proxy if running outside Israeli borders
    var options = {
        //proxy: 'http://user:pass@hostname:port/'
    };

    // Get currently active alert
    // Example response:
    // { 
    //    type: 'missiles', 
    //    cities: ['תל אביב - מזרח', 'חיפה - כרמל ועיר תחתית', 'עין גדי'],
    //    instructions: 'היכנסו למבנה, נעלו את הדלתות וסגרו את החלונות'
    // }
    pikudHaoref.getActiveAlert(async function (err, alert) {
        // Schedule polling in X millis
        setTimeout(poll, interval);
        
        // Log errors
        if (err) {
            return console.log(i, 'Retrieving active alert failed: ', err);
        	}

		//send a ping that this is working correctly, but only once per hour. We already have a TTL cache for this
		if(awsKeys.uptimePingURL && !uptimeAlertsHourly.get('pinged')) {
			console.log('Sending startup or hourly ping to https://healthchecks.io to show script is alive');
			await fetch(awsKeys.uptimePingURL)
				.then(()=>uptimeAlertsHourly.set('pinged', true))
				.catch(console.error);
			}

        // Alert header
		//show days:hours:minutes:seconds since starting
		const uptime = new Date() - startTime;
		const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
		const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
		const view = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        console.log(i, view, 'Currently active alert:');
        console.log(alert);


		if((alert.type && alert.type!="none") || alert.instructions){
			var email = {
			subject: 'פיקוד העורף - '+alert.instructions
			, body: '(הודעה זו היא אוטומטית וישירה מפיקוד העורף.)' + '\n' + 'הוראות: ' + alert.instructions + '\n' + 'סוג התראה: ' + alert.type
				}
			}

		//time now
		const now = new Date();
		//log the local time:
		alert.date = now.toISOString();
		alert.time= now.toLocaleTimeString();
		if(alert.cities && alert.cities.includes(awsKeys.locationToMonitor)) {
			alert.isLocal=true;
			console.warn('FOUND ALERT IN ' + awsKeys.locationToMonitor + '!!!!!')
			}

		//save all alerts
		fs.appendFileSync('alerts.json', JSON.stringify(alert)+',\n');

		//only try/save alert emails for tel tzion
		if(email && alert.isLocal && !sentAlertsCache.has(alert.instructions)) {
			console.log('First time alert in past 5 minutes! Sending email!');
			sentAlertsCache.set(alert.instructions, true);
			sendEmail(email);
			fs.appendFileSync('alerts.json', JSON.stringify(email)+',\n');
			}

        // Line break for readability
        console.log();
		i++;
    }, options);
}

// Start polling for active alert
poll();