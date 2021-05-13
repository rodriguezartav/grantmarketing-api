var d3   = require('d3');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const moment = require("moment");

var http = require('http');

function svgDOM(width, height) {
    const Dom = new JSDOM(`<!DOCTYPE html><div id="root"><div>`);
const document = Dom.window.document;
  // Setup DOM
   var body = d3.select(document.body);

  // Create svg node
  return body.append('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    .attr('width', width)
    .attr('height', height);
}

function d3Draw() {
  // Copied from https://gist.github.com/mbostock/45943c4af772e38b4f4e
  const data = [{"date":"2007-05-20T00:00:00.000Z","close":111.98,"lower":93.21,"middle":103.79,"upper":114.38},{"date":"2007-05-21T00:00:00.000Z","close":113.54,"lower":94.59,"middle":104.81,"upper":115.02},{"date":"2007-05-22T00:00:00.000Z","close":112.89,"lower":95.89,"middle":105.68,"upper":115.48},{"date":"2007-05-23T00:00:00.000Z","close":110.69,"lower":96.79,"middle":106.28,"upper":115.76},{"date":"2007-05-24T00:00:00.000Z","close":113.62,"lower":97.43,"middle":106.96,"upper":116.49},{"date":"2007-05-28T00:00:00.000Z","close":114.35,"lower":98.24,"middle":107.69,"upper":117.14},{"date":"2007-05-29T00:00:00.000Z","close":118.77,"lower":98.81,"middle":108.65,"upper":118.5},{"date":"2007-05-30T00:00:00.000Z","close":121.19,"lower":99.15,"middle":109.69,"upper":120.23},{"date":"2007-06-01T00:00:00.000Z","close":118.4,"lower":100.32,"middle":110.59,"upper":120.86},{"date":"2007-06-04T00:00:00.000Z","close":121.33,"lower":101.36,"middle":111.62,"upper":121.88}]
  var margin = ({top: 20, right: 30, bottom: 30, left: 40})

  var width = 960,
      height = 960,
      outerRadius = width / 2 - 20,
      innerRadius = outerRadius - 80;

  var svg = svgDOM(width, height);
  
  x = d3.scaleUtc()
    .domain(d3.extent(data, d => moment(d.date ).toDate() ))
    .range([margin.left, width - margin.right])

    y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.upper)])
    .range([height - margin.bottom, margin.top])

    line = d3.line()
    .x(d => x(moment(d.date ).toDate()))
    .y(d => y(d.upper))
  
    svg
      .append("path")
      .attr("d", line(data))
 
  //d3.select(self.frameElement).style("height", height + "px");

  return svg.node().outerHTML;
}

http.createServer(
  function (req, res) {
    // favicon - browser annoyance, ignore 
    if(req.url.indexOf('favicon.ico') >= 0) {
      res.statusCode = 404
      return
    }

    res.writeHead(200, { "Content-Type": 'image/svg+xml' });
    res.end(d3Draw());
  }
)
.listen(8080, function() {
  console.log("Server listening on port 8080");
});