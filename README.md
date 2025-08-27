# israel-alerts-to-email
Monitor Pikud Haoref website for a specific location and send out email alerts.

Create aws.json for config like so, and customize all the values:
```
{
	"region": "us-east-1",
	"accessKey": "*****************",
	"secretKey": "*************************************",
	"from": "your-sender-email@gmail.com",
	"to": ["destination-for-alert@googlegroups.com"],
	"cc": ["if-applicable@gmail.com"],
	"uptimePingURL": "https://hc-ping.com/****-***-***-****-********",
	"locationToMonitor": "תל ציון"
}
```

To run:
- `npm install`
- `node index.js`

NOTE: You must run this from an Israel IP to access the pikud haoref website.

`uptimePingURL` via http://healthchecks.io optional.
