if (!process.env.NODE_ENV) require("dotenv").config();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const Dom = new JSDOM(`<!DOCTYPE html>`);
const document = Dom.window.document;
const xmldom = require("xmldom");

const Knex = require("../../helpers/knex_pg");
const Kraken = require("../../helpers/kraken");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment");
const position = require("@alpacahq/alpaca-trade-api/lib/resources/position");
const sms = require("../../helpers/sms");
var timeseries = require("timeseries-analysis");
const percentage = require('calculate-percentages')
const d3 = require("d3")
const d3random = require("d3-random");

const {
  QueryInstance,
} = require("twilio/lib/rest/autopilot/v1/assistant/query");
const { quote } = require("../../helpers/alpaca");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];

  const knex = Knex(pgString);
  const kraken = Kraken(integrationMap["kraken"]);
  const fs = require("fs");


  

  const balance = await kraken.api("OHLC", { pair: "ETHUSD", interval: 5 });
  console.log(balance);


  const keys = Object.keys(balance.result);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];

    if(key == "last") return false;

    const lastValues =balance.result[key].map(item => { return {date: new Date(item[0]*1000)  , low:parseFloat(item[3]),high:parseFloat(item[2]), close: parseFloat(item[4]) } })
    const grahph = makeGraph(lastValues)
 
console.log(rasterize()(grahph) );

    const nameKey = key.replace("X","").replace("ZUSD","");
    const last =balance.result[key][balance.result[key].length-1];
    const time = last[0];
    const high = last[2];
    const close = last[4];
    const low = last[3];
    const vol = last[6];



    const diff = function(a,b){
      const diff1 = percentage.absoluteDifferenceBetween(a,b);
      return parseInt(diff1*10)/10;
    }

    var t = new timeseries.main( balance.result[key].splice(-100).map(item=> [item[0], parseFloat(item[4]) ] ));
    var tvol = new timeseries.main( balance.result[key].splice(-100).map(item=> [item[0], parseFloat(item[6]) ] ));


    

    await sms(`${nameKey}: ${close} -${diff(low,close)}% +${diff(high,close)}% ${t.min()} ${t.max()} ` , "whatsapp:+50684191862");

   // await sms(`Price` , "whatsapp:+50684191862",[t.ma({period: 14}).chart({main:true}), tvol.ma({period: 14}).chart({main:true}) ]   );


    

    
  }


  return true;
}


function makeGraph(lastValues){


  var xml = d3.select(document.body).append("svg").attr('xmlns', 'http://www.w3.org/2000/svg');
  
  
  
 return BuildGraph(document,xml,chartData);


}

 
function BuildGraph(document, wrapper, data) {
    // EDITING STARTS HERE


    /*
     * Use this variable instead of d3.select("body").append("svg")
     * */
    // var svg = d3.select("body").append("svg")
 
        margin = ({top: 20, right: 20, bottom: 30, left: 40})
const width= 600
   const     height = 500
    const    color = "steelblue"

        yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call(g => g.select(".domain").remove())
    .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 4)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(data.y))

        xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(width / 80 ).tickSizeOuter(0))
    .call(g => g.append("text")
        .attr("x", width - margin.right)
        .attr("y", -4)
        .attr("fill", "currentColor")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text(data.x))

        y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)]).nice()
    .range([height - margin.bottom, margin.top])


    x = d3.scaleLinear()
    .domain([bins[0].x0, bins[bins.length - 1].x1])
    .range([margin.left, width - margin.right])


    var svg = wrapper
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

 

svg.append("g")
    .attr("fill", color)
  .selectAll("rect")
  .data(bins)
  .join("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("y", d => y(d.length))
    .attr("height", d => y(0) - y(d.length));

svg.append("g")
    .call(xAxis);

svg.append("g")
    .call(yAxis);


 
    // EDITING ENDS HERE
    return svg
};

function rasterize(svg) {
  let resolve, reject;
  const promise = new Promise((y, n) => (resolve = y, reject = n));
  const image = new Image;
  image.onerror = reject;
  image.onload = () => {
    const rect = svg.getBoundingClientRect();
    const context = DOM.context2d(rect.width, rect.height);
    context.drawImage(image, 0, 0, rect.width, rect.height);
    context.canvas.toBlob(resolve);
  };
  image.src = URL.createObjectURL(serialize(svg));
  return promise;
}

function serialize()  {
  const xmlns = "http://www.w3.org/2000/xmlns/";
  const xlinkns = "http://www.w3.org/1999/xlink";
  const svgns = "http://www.w3.org/2000/svg";
  return function serialize(svg) {
    svg = svg.node(true);
    const fragment = Dom.window.location.href + "#";
    const walker = document.createTreeWalker(svg, "SHOW_ELEMENT");
    while (walker.nextNode()) {
      for (const attr of walker.currentNode.attributes) {
        if (attr.value.includes(fragment)) {
          attr.value = attr.value.replace(fragment, "#");
        }
      }
    }
    svg.setAttributeNS(xmlns, "xmlns", svgns);
    svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
    const serializer = new Dom.window.XMLSerializer;
    const string = serializer.serializeToString(svg);
    return new Dom.window.Blob([string], {type: "image/svg+xml"});
  };
}

module.exports = Run;


var chartData = {
  "name": "flare",
  "children": [
      {
          "name": "analytics",
          "children": [
              {
                  "name": "cluster",
                  "children": [
                      {
                          "name": "AgglomerativeCluster",
                          "size": 3938
                      },
                      {
                          "name": "CommunityStructure",
                          "size": 3812
                      },
                      {
                          "name": "HierarchicalCluster",
                          "size": 6714
                      },
                      {
                          "name": "MergeEdge",
                          "size": 743
                      }
                  ]
              },
              {
                  "name": "graph",
                  "children": [
                      {
                          "name": "BetweennessCentrality",
                          "size": 3534
                      },
                      {
                          "name": "LinkDistance",
                          "size": 5731
                      },
                      {
                          "name": "MaxFlowMinCut",
                          "size": 7840
                      },
                      {
                          "name": "ShortestPaths",
                          "size": 5914
                      },
                      {
                          "name": "SpanningTree",
                          "size": 3416
                      }
                  ]
              },
              {
                  "name": "optimization",
                  "children": [
                      {
                          "name": "AspectRatioBanker",
                          "size": 7074
                      }
                  ]
              }
          ]
      },
      {
          "name": "animate",
          "children": [
              {
                  "name": "Easing",
                  "size": 17010
              },
              {
                  "name": "FunctionSequence",
                  "size": 5842
              },
              {
                  "name": "interpolate",
                  "children": [
                      {
                          "name": "ArrayInterpolator",
                          "size": 1983
                      },
                      {
                          "name": "ColorInterpolator",
                          "size": 2047
                      },
                      {
                          "name": "DateInterpolator",
                          "size": 1375
                      },
                      {
                          "name": "Interpolator",
                          "size": 8746
                      },
                      {
                          "name": "MatrixInterpolator",
                          "size": 2202
                      },
                      {
                          "name": "NumberInterpolator",
                          "size": 1382
                      },
                      {
                          "name": "ObjectInterpolator",
                          "size": 1629
                      },
                      {
                          "name": "PointInterpolator",
                          "size": 1675
                      },
                      {
                          "name": "RectangleInterpolator",
                          "size": 2042
                      }
                  ]
              },
              {
                  "name": "ISchedulable",
                  "size": 1041
              },
              {
                  "name": "Parallel",
                  "size": 5176
              },
              {
                  "name": "Pause",
                  "size": 449
              },
              {
                  "name": "Scheduler",
                  "size": 5593
              },
              {
                  "name": "Sequence",
                  "size": 5534
              },
              {
                  "name": "Transition",
                  "size": 9201
              },
              {
                  "name": "Transitioner",
                  "size": 19975
              },
              {
                  "name": "TransitionEvent",
                  "size": 1116
              },
              {
                  "name": "Tween",
                  "size": 6006
              }
          ]
      },
      {
          "name": "data",
          "children": [
              {
                  "name": "converters",
                  "children": [
                      {
                          "name": "Converters",
                          "size": 721
                      },
                      {
                          "name": "DelimitedTextConverter",
                          "size": 4294
                      },
                      {
                          "name": "GraphMLConverter",
                          "size": 9800
                      },
                      {
                          "name": "IDataConverter",
                          "size": 1314
                      },
                      {
                          "name": "JSONConverter",
                          "size": 2220
                      }
                  ]
              },
              {
                  "name": "DataField",
                  "size": 1759
              },
              {
                  "name": "DataSchema",
                  "size": 2165
              },
              {
                  "name": "DataSet",
                  "size": 586
              },
              {
                  "name": "DataSource",
                  "size": 3331
              },
              {
                  "name": "DataTable",
                  "size": 772
              },
              {
                  "name": "DataUtil",
                  "size": 3322
              }
          ]
      },
      {
          "name": "display",
          "children": [
              {
                  "name": "DirtySprite",
                  "size": 8833
              },
              {
                  "name": "LineSprite",
                  "size": 1732
              },
              {
                  "name": "RectSprite",
                  "size": 3623
              },
              {
                  "name": "TextSprite",
                  "size": 10066
              }
          ]
      },
      {
          "name": "flex",
          "children": [
              {
                  "name": "FlareVis",
                  "size": 4116
              }
          ]
      },
      {
          "name": "physics",
          "children": [
              {
                  "name": "DragForce",
                  "size": 1082
              },
              {
                  "name": "GravityForce",
                  "size": 1336
              },
              {
                  "name": "IForce",
                  "size": 319
              },
              {
                  "name": "NBodyForce",
                  "size": 10498
              },
              {
                  "name": "Particle",
                  "size": 2822
              },
              {
                  "name": "Simulation",
                  "size": 9983
              },
              {
                  "name": "Spring",
                  "size": 2213
              },
              {
                  "name": "SpringForce",
                  "size": 1681
              }
          ]
      },
      {
          "name": "query",
          "children": [
              {
                  "name": "AggregateExpression",
                  "size": 1616
              },
              {
                  "name": "And",
                  "size": 1027
              },
              {
                  "name": "Arithmetic",
                  "size": 3891
              },
              {
                  "name": "Average",
                  "size": 891
              },
              {
                  "name": "BinaryExpression",
                  "size": 2893
              },
              {
                  "name": "Comparison",
                  "size": 5103
              },
              {
                  "name": "CompositeExpression",
                  "size": 3677
              },
              {
                  "name": "Count",
                  "size": 781
              },
              {
                  "name": "DateUtil",
                  "size": 4141
              },
              {
                  "name": "Distinct",
                  "size": 933
              },
              {
                  "name": "Expression",
                  "size": 5130
              },
              {
                  "name": "ExpressionIterator",
                  "size": 3617
              },
              {
                  "name": "Fn",
                  "size": 3240
              },
              {
                  "name": "If",
                  "size": 2732
              },
              {
                  "name": "IsA",
                  "size": 2039
              },
              {
                  "name": "Literal",
                  "size": 1214
              },
              {
                  "name": "Match",
                  "size": 3748
              },
              {
                  "name": "Maximum",
                  "size": 843
              },
              {
                  "name": "methods",
                  "children": [
                      {
                          "name": "add",
                          "size": 593
                      },
                      {
                          "name": "and",
                          "size": 330
                      },
                      {
                          "name": "average",
                          "size": 287
                      },
                      {
                          "name": "count",
                          "size": 277
                      },
                      {
                          "name": "distinct",
                          "size": 292
                      },
                      {
                          "name": "div",
                          "size": 595
                      },
                      {
                          "name": "eq",
                          "size": 594
                      },
                      {
                          "name": "fn",
                          "size": 460
                      },
                      {
                          "name": "gt",
                          "size": 603
                      },
                      {
                          "name": "gte",
                          "size": 625
                      },
                      {
                          "name": "iff",
                          "size": 748
                      },
                      {
                          "name": "isa",
                          "size": 461
                      },
                      {
                          "name": "lt",
                          "size": 597
                      },
                      {
                          "name": "lte",
                          "size": 619
                      },
                      {
                          "name": "max",
                          "size": 283
                      },
                      {
                          "name": "min",
                          "size": 283
                      },
                      {
                          "name": "mod",
                          "size": 591
                      },
                      {
                          "name": "mul",
                          "size": 603
                      },
                      {
                          "name": "neq",
                          "size": 599
                      },
                      {
                          "name": "not",
                          "size": 386
                      },
                      {
                          "name": "or",
                          "size": 323
                      },
                      {
                          "name": "orderby",
                          "size": 307
                      },
                      {
                          "name": "range",
                          "size": 772
                      },
                      {
                          "name": "select",
                          "size": 296
                      },
                      {
                          "name": "stddev",
                          "size": 363
                      },
                      {
                          "name": "sub",
                          "size": 600
                      },
                      {
                          "name": "sum",
                          "size": 280
                      },
                      {
                          "name": "update",
                          "size": 307
                      },
                      {
                          "name": "variance",
                          "size": 335
                      },
                      {
                          "name": "where",
                          "size": 299
                      },
                      {
                          "name": "xor",
                          "size": 354
                      },
                      {
                          "name": "_",
                          "size": 264
                      }
                  ]
              },
              {
                  "name": "Minimum",
                  "size": 843
              },
              {
                  "name": "Not",
                  "size": 1554
              },
              {
                  "name": "Or",
                  "size": 970
              },
              {
                  "name": "Query",
                  "size": 13896
              },
              {
                  "name": "Range",
                  "size": 1594
              },
              {
                  "name": "StringUtil",
                  "size": 4130
              },
              {
                  "name": "Sum",
                  "size": 791
              },
              {
                  "name": "Variable",
                  "size": 1124
              },
              {
                  "name": "Variance",
                  "size": 1876
              },
              {
                  "name": "Xor",
                  "size": 1101
              }
          ]
      },
      {
          "name": "scale",
          "children": [
              {
                  "name": "IScaleMap",
                  "size": 2105
              },
              {
                  "name": "LinearScale",
                  "size": 1316
              },
              {
                  "name": "LogScale",
                  "size": 3151
              },
              {
                  "name": "OrdinalScale",
                  "size": 3770
              },
              {
                  "name": "QuantileScale",
                  "size": 2435
              },
              {
                  "name": "QuantitativeScale",
                  "size": 4839
              },
              {
                  "name": "RootScale",
                  "size": 1756
              },
              {
                  "name": "Scale",
                  "size": 4268
              },
              {
                  "name": "ScaleType",
                  "size": 1821
              },
              {
                  "name": "TimeScale",
                  "size": 5833
              }
          ]
      },
      {
          "name": "util",
          "children": [
              {
                  "name": "Arrays",
                  "size": 8258
              },
              {
                  "name": "Colors",
                  "size": 10001
              },
              {
                  "name": "Dates",
                  "size": 8217
              },
              {
                  "name": "Displays",
                  "size": 12555
              },
              {
                  "name": "Filter",
                  "size": 2324
              },
              {
                  "name": "Geometry",
                  "size": 10993
              },
              {
                  "name": "heap",
                  "children": [
                      {
                          "name": "FibonacciHeap",
                          "size": 9354
                      },
                      {
                          "name": "HeapNode",
                          "size": 1233
                      }
                  ]
              },
              {
                  "name": "IEvaluable",
                  "size": 335
              },
              {
                  "name": "IPredicate",
                  "size": 383
              },
              {
                  "name": "IValueProxy",
                  "size": 874
              },
              {
                  "name": "math",
                  "children": [
                      {
                          "name": "DenseMatrix",
                          "size": 3165
                      },
                      {
                          "name": "IMatrix",
                          "size": 2815
                      },
                      {
                          "name": "SparseMatrix",
                          "size": 3366
                      }
                  ]
              },
              {
                  "name": "Maths",
                  "size": 17705
              },
              {
                  "name": "Orientation",
                  "size": 1486
              },
              {
                  "name": "palette",
                  "children": [
                      {
                          "name": "ColorPalette",
                          "size": 6367
                      },
                      {
                          "name": "Palette",
                          "size": 1229
                      },
                      {
                          "name": "ShapePalette",
                          "size": 2059
                      },
                      {
                          "name": "SizePalette",
                          "size": 2291
                      }
                  ]
              },
              {
                  "name": "Property",
                  "size": 5559
              },
              {
                  "name": "Shapes",
                  "size": 19118
              },
              {
                  "name": "Sort",
                  "size": 6887
              },
              {
                  "name": "Stats",
                  "size": 6557
              },
              {
                  "name": "Strings",
                  "size": 22026
              }
          ]
      },
      {
          "name": "vis",
          "children": [
              {
                  "name": "axis",
                  "children": [
                      {
                          "name": "Axes",
                          "size": 1302
                      },
                      {
                          "name": "Axis",
                          "size": 24593
                      },
                      {
                          "name": "AxisGridLine",
                          "size": 652
                      },
                      {
                          "name": "AxisLabel",
                          "size": 636
                      },
                      {
                          "name": "CartesianAxes",
                          "size": 6703
                      }
                  ]
              },
              {
                  "name": "controls",
                  "children": [
                      {
                          "name": "AnchorControl",
                          "size": 2138
                      },
                      {
                          "name": "ClickControl",
                          "size": 3824
                      },
                      {
                          "name": "Control",
                          "size": 1353
                      },
                      {
                          "name": "ControlList",
                          "size": 4665
                      },
                      {
                          "name": "DragControl",
                          "size": 2649
                      },
                      {
                          "name": "ExpandControl",
                          "size": 2832
                      },
                      {
                          "name": "HoverControl",
                          "size": 4896
                      },
                      {
                          "name": "IControl",
                          "size": 763
                      },
                      {
                          "name": "PanZoomControl",
                          "size": 5222
                      },
                      {
                          "name": "SelectionControl",
                          "size": 7862
                      },
                      {
                          "name": "TooltipControl",
                          "size": 8435
                      }
                  ]
              },
              {
                  "name": "data",
                  "children": [
                      {
                          "name": "Data",
                          "size": 20544
                      },
                      {
                          "name": "DataList",
                          "size": 19788
                      },
                      {
                          "name": "DataSprite",
                          "size": 10349
                      },
                      {
                          "name": "EdgeSprite",
                          "size": 3301
                      },
                      {
                          "name": "NodeSprite",
                          "size": 19382
                      },
                      {
                          "name": "render",
                          "children": [
                              {
                                  "name": "ArrowType",
                                  "size": 698
                              },
                              {
                                  "name": "EdgeRenderer",
                                  "size": 5569
                              },
                              {
                                  "name": "IRenderer",
                                  "size": 353
                              },
                              {
                                  "name": "ShapeRenderer",
                                  "size": 2247
                              }
                          ]
                      },
                      {
                          "name": "ScaleBinding",
                          "size": 11275
                      },
                      {
                          "name": "Tree",
                          "size": 7147
                      },
                      {
                          "name": "TreeBuilder",
                          "size": 9930
                      }
                  ]
              },
              {
                  "name": "events",
                  "children": [
                      {
                          "name": "DataEvent",
                          "size": 2313
                      },
                      {
                          "name": "SelectionEvent",
                          "size": 1880
                      },
                      {
                          "name": "TooltipEvent",
                          "size": 1701
                      },
                      {
                          "name": "VisualizationEvent",
                          "size": 1117
                      }
                  ]
              },
              {
                  "name": "legend",
                  "children": [
                      {
                          "name": "Legend",
                          "size": 20859
                      },
                      {
                          "name": "LegendItem",
                          "size": 4614
                      },
                      {
                          "name": "LegendRange",
                          "size": 10530
                      }
                  ]
              },
              {
                  "name": "operator",
                  "children": [
                      {
                          "name": "distortion",
                          "children": [
                              {
                                  "name": "BifocalDistortion",
                                  "size": 4461
                              },
                              {
                                  "name": "Distortion",
                                  "size": 6314
                              },
                              {
                                  "name": "FisheyeDistortion",
                                  "size": 3444
                              }
                          ]
                      },
                      {
                          "name": "encoder",
                          "children": [
                              {
                                  "name": "ColorEncoder",
                                  "size": 3179
                              },
                              {
                                  "name": "Encoder",
                                  "size": 4060
                              },
                              {
                                  "name": "PropertyEncoder",
                                  "size": 4138
                              },
                              {
                                  "name": "ShapeEncoder",
                                  "size": 1690
                              },
                              {
                                  "name": "SizeEncoder",
                                  "size": 1830
                              }
                          ]
                      },
                      {
                          "name": "filter",
                          "children": [
                              {
                                  "name": "FisheyeTreeFilter",
                                  "size": 5219
                              },
                              {
                                  "name": "GraphDistanceFilter",
                                  "size": 3165
                              },
                              {
                                  "name": "VisibilityFilter",
                                  "size": 3509
                              }
                          ]
                      },
                      {
                          "name": "IOperator",
                          "size": 1286
                      },
                      {
                          "name": "label",
                          "children": [
                              {
                                  "name": "Labeler",
                                  "size": 9956
                              },
                              {
                                  "name": "RadialLabeler",
                                  "size": 3899
                              },
                              {
                                  "name": "StackedAreaLabeler",
                                  "size": 3202
                              }
                          ]
                      },
                      {
                          "name": "layout",
                          "children": [
                              {
                                  "name": "AxisLayout",
                                  "size": 6725
                              },
                              {
                                  "name": "BundledEdgeRouter",
                                  "size": 3727
                              },
                              {
                                  "name": "CircleLayout",
                                  "size": 9317
                              },
                              {
                                  "name": "CirclePackingLayout",
                                  "size": 12003
                              },
                              {
                                  "name": "DendrogramLayout",
                                  "size": 4853
                              },
                              {
                                  "name": "ForceDirectedLayout",
                                  "size": 8411
                              },
                              {
                                  "name": "IcicleTreeLayout",
                                  "size": 4864
                              },
                              {
                                  "name": "IndentedTreeLayout",
                                  "size": 3174
                              },
                              {
                                  "name": "Layout",
                                  "size": 7881
                              },
                              {
                                  "name": "NodeLinkTreeLayout",
                                  "size": 12870
                              },
                              {
                                  "name": "PieLayout",
                                  "size": 2728
                              },
                              {
                                  "name": "RadialTreeLayout",
                                  "size": 12348
                              },
                              {
                                  "name": "RandomLayout",
                                  "size": 870
                              },
                              {
                                  "name": "StackedAreaLayout",
                                  "size": 9121
                              },
                              {
                                  "name": "TreeMapLayout",
                                  "size": 9191
                              }
                          ]
                      },
                      {
                          "name": "Operator",
                          "size": 2490
                      },
                      {
                          "name": "OperatorList",
                          "size": 5248
                      },
                      {
                          "name": "OperatorSequence",
                          "size": 4190
                      },
                      {
                          "name": "OperatorSwitch",
                          "size": 2581
                      },
                      {
                          "name": "SortOperator",
                          "size": 2023
                      }
                  ]
              },
              {
                  "name": "Visualization",
                  "size": 16540
              }
          ]
      }
  ]
};

const bins = [[1.9,1.8,1.8,1.7,1.8,1.8,1.9,1.8,1.9,1.6,1.7,1.9,1.9,1.9,1.8,1.9,1.9],[2.2,2.4,2.3,2.1,2,2.3,2.1,2.3,2.4,2.4,2.2,2.1,2.1,2.2,2,2.3,2.4,2.2,2.4,2.3,2.3,2.4,2.1,2.4,2.3,2.4,2.4,2.3,2.3,2,2,2.2,2.4,2.3,2.1,2.3,2,2.4,2.3,2.1,2,2.3,2.4,2.4,2.2,2.1,2.1,2.4,2.1,2,2,2.4,2.4,2.1,2.1,2.4,2.2,2.3,2,2.4,2.3,2.1,2.2,2.2,2],[2.7,2.8,2.6,2.9,2.7,2.8,2.5,2.6,2.6,2.6,2.9,2.9,2.5,2.7,2.7,2.6,2.8,2.6,2.9,2.9,2.8,2.9,2.9,2.8,2.9,2.9,2.6,2.7,2.8,2.7,2.9,2.9,2.6,2.7,2.9,2.6,2.6,2.7,2.9,2.6,2.9,2.7,2.9,2.8,2.7,2.9,2.7,2.5,2.9,2.5,2.8,2.8,2.8,2.8,2.5,2.5,2.6,2.5,2.8,2.8,2.7,2.7,2.6,2.9,2.9,2.8,2.7,2.9,2.7,2.8,2.5,2.9,2.5,2.8,2.5,2.7,2.6,2.6,2.7,2.8,2.9,2.7,2.9,2.6,2.8,2.9,2.6,2.7,2.5,2.9,2.5,2.8,2.5,2.9,2.6,2.9,2.9,2.9,2.9,2.5,2.7,2.7,2.7,2.7,2.5,2.5,2.9,2.5,2.9,2.7,2.6,2.5,2.5,2.6,2.8,2.8,2.9,2.8,2.7,2.6,2.8,2.5,2.6,2.9,2.5,2.9,2.9,2.8,2.8,2.8,2.9,2.7,2.9,2.6,2.9,2.7,2.8,2.9],[3.2,3,3,3.2,3.3,3.1,3.2,3.4,3.2,3,3,3.2,3.2,3.1,3.1,3.1,3.3,3,3.2,3.3,3.1,3.3,3.2,3.1,3,3.4,3.4,3.4,3.2,3.2,3.3,3.2,3,3.1,3.2,3.1,3.1,3.1,3.4,3.2,3.3,3.4,3.4,3.4,3.1,3,3.4,3.2,3,3.2,3.2,3.2,3,3.4,3,3,3.1,3.4,3,3.2,3.3,3,3.2,3.3,3.4,3,3.2,3.2,3.1,3,3.2,3.3,3.2,3.3,3.3,3.1,3.3,3,3.2,3.2,3.2,3.4,3.4,3.4,3.3,3.2,3.4,3.3,3.4,3.4,3.2,3.1,3,3.3,3.4,3.2,3.1,3,3.4,3.2,3.4,3,3.3,3,3,3.2,3,3.2,3.4,3.4,3.1,3.3,3.2,3.3,3.1,3.1,3.3,3.1,3,3.2,3.3,3,3.3,3.2,3.3,3,3.2,3.2,3.4,3,3.4,3.4,3.3,3.3,3.3,3.2,3.4,3.1,3.1,3,3,3.2,3,3,3,3.2,3.3,3.1,3.1,3.2,3.1,3.4,3.3,3.2,3.2,3.4,3.2,3.1,3.3,3.2,3.1,3.2,3.1,3.1,3.1,3,3.3,3.4,3.3,3,3.2,3.4,3.2,3.1,3.3,3.3,3,3.1,3.2,3.2,3,3.3,3.3,3.4,3.2,3.1,3.2,3.3,3.2,3.4,3.2,3.4,3.4,3.3,3,3.4,3.1,3.4,3.2,3.2,3.1,3,3.1,3.2,3.1,3.3,3.1,3.3,3.2,3.4,3.4,3.4,3.2,3,3.2,3.1,3.3,3.3,3.1,3.4,3.4,3.2,3.3,3.4,3.4,3.1,3,3.1,3.4,3.4,3.2,3.4,3.1,3.3,3.4,3.1,3.4,3.3,3.3,3.3],[3.6,3.7,3.9,3.7,3.9,3.9,3.7,3.6,3.8,3.7,3.6,3.8,3.7,3.5,3.7,3.5,3.5,3.5,3.6,3.6,3.9,3.6,3.9,3.5,3.5,3.7,3.5,3.7,3.8,3.9,3.6,3.5,3.6,3.7,3.7,3.6,3.7,3.9,3.9,3.8,3.8,3.6,3.6,3.8,3.6,3.6,3.8,3.6,3.8,3.7,3.9,3.8,3.8,3.6,3.9,3.7,3.8,3.5,3.7,3.5,3.9,3.8,3.7,3.6,3.7,3.6,3.8,3.7,3.9,3.8,3.7,3.9,3.8,3.5,3.6,3.5,3.5,3.6,3.9,3.7,3.7,3.5,3.9,3.9,3.6,3.6,3.6,3.7,3.8,3.7,3.8,3.9,3.9,3.6,3.5,3.8,3.5,3.6,3.9,3.6,3.8,3.9,3.8,3.8,3.6,3.8,3.6,3.5,3.9,3.5,3.6,3.8,3.9,3.8,3.9,3.9,3.6,3.7,3.5,3.7,3.6,3.6,3.7,3.5,3.7,3.5,3.8,3.8,3.7,3.9,3.9,3.5,3.6,3.9,3.7,3.7,3.7,3.5,3.5,3.9,3.7,3.9,3.6,3.6,3.8,3.6,3.6,3.7,3.5,3.8,3.9,3.7,3.5,3.7,3.8,3.6,3.5,3.8,3.6,3.7,3.5,3.9,3.5,3.7,3.6,3.5,3.6,3.5,3.5,3.5,3.7,3.7,3.7,3.5,3.6,3.5,3.8,3.7,3.5,3.8,3.8,3.7,3.9,3.5,3.8,3.7,3.8,3.7,3.9,3.8,3.5,3.7,3.6,3.5,3.7,3.5,3.7,3.9,3.9,3.9,3.5,3.9,3.5,3.7,3.5,3.7,3.9,3.6,3.6,3.7,3.7,3.6,3.6,3.9,3.5,3.6,3.8,3.6,3.8,3.6,3.8,3.7,3.5,3.5,3.9,3.8,3.5,3.5,3.5,3.9,3.8,3.6,3.5,3.7,3.7,3.8,3.7,3.8,3.6,3.9,3.9,3.6,3.7,3.7,3.9,3.6,3.9,3.9,3.8,3.6,3.5,3.9,3.5,3.7,3.7,3.7,3.6,3.6,3.6,3.5,3.8,3.8,3.6,3.6,3.5,3.9,3.8,3.7,3.7,3.8,3.7,3.5,3.9,3.6,3.6,3.5,3.6,3.6,3.6,3.8,3.9,3.5,3.5,3.5,3.6,3.9,3.9,3.9,3.9,3.5,3.9,3.6,3.6,3.7,3.8,3.6,3.7,3.9,3.7,3.9,3.7,3.5,3.9,3.5,3.8,3.8,3.5,3.8,3.5,3.9,3.5,3.6,3.7,3.7,3.8,3.7,3.8],[4.2,4.4,4.1,4.4,4.4,4,4,4.4,4.3,4.4,4.1,4.3,4.4,4,4.3,4,4.1,4.3,4.1,4.4,4.2,4.4,4.1,4.3,4.4,4.3,4.3,4.2,4.1,4.1,4.1,4.4,4.1,4.4,4.1,4,4.4,4.1,4.3,4.1,4.4,4.1,4.2,4.3,4,4.1,4.2,4.2,4.1,4.4,4.4,4.4,4.3,4.3,4.3,4.4,4.4,4,4.2,4,4.4,4.2,4,4.4,4.2,4,4,4.1,4.1,4.2,4.2,4.3,4,4,4.2,4.3,4.2,4.4,4.4,4,4,4.2,4.4,4.4,4.1,4.1,4.2,4,4.2,4.1,4.3,4,4.2,4.4,4,4.4,4.3,4.3,4,4.2,4.4,4.1,4,4.2,4.4,4.1,4.2,4.4,4.2,4.1,4.3,4,4,4.1,4,4.3,4.3,4.3,4.1,4.1,4.1,4,4.2,4.3,4.1,4.4,4,4.4,4.3,4.2,4,4.1,4.4,4.4,4.2,4.2,4.3,4.4,4.3,4.3,4.2,4,4,4.2,4,4,4.1,4.3,4,4,4.1,4.4,4.4,4.4,4.2,4,4.1,4.3,4,4.2,4.4,4.4,4.2,4.1,4.3,4.2,4,4,4.3,4.1,4.2,4,4.2,4.3,4.1,4,4.3,4.4,4,4.3,4,4.1,4.2,4.2,4.1,4,4.1,4.2,4.3,4.4,4.4,4.1,4.4,4.3,4,4.2,4.2,4.3,4.3,4.1,4.2,4.1,4.1,4.3,4.3,4.4,4.1,4.2,4.4,4,4.4,4.4,4,4.1,4.4,4.2,4.3,4.2,4.2,4.3,4.1,4.1,4.2,4.3,4.1,4.3,4.1,4.2,4.1,4.3,4.2,4.4,4.4,4.3,4.4,4.2,4.4,4.1,4.3,4.2,4.1,4.1,4.3,4,4.4,4.2,4.2,4.2,4.1,4.1,4.3,4,4.4,4.2,4.2,4.3,4.1,4.4,4.1,4,4.3,4.3,4,4.1,4.3,4.3,4.3,4.3,4.3,4,4.2,4,4.3,4,4.3,4,4.4,4.3,4.3,4.4,4.2,4.2,4.4,4,4.2,4.1,4,4.3,4.1,4.1,4.3,4.2,4.2,4.1,4.2,4.3,4.1,4.1,4.1,4.3,4,4,4.2,4,4.2,4.3,4.4,4.4,4.3,4,4.2,4,4.1,4,4.4,4.2,4,4.2,4,4.2,4,4.3,4.3,4.1,4.3,4.4,4.4,4.4,4.3,4.4,4.2,4.1,4.4,4.4,4,4.3,4.1,4,4.2,4,4.4,4.4,4,4,4.1,4.1,4.3,4,4.1,4.2,4.3,4,4.3,4.3,4.3,4.3,4,4.4,4.1,4,4.3,4.4,4,4],[4.9,4.8,4.7,4.9,4.9,4.9,4.8,4.9,4.5,4.8,4.5,4.5,4.9,4.5,4.6,4.7,4.7,4.6,4.8,4.8,4.8,4.6,4.7,4.9,4.8,4.7,4.5,4.8,4.9,4.8,4.7,4.5,4.6,4.9,4.8,4.8,4.8,4.5,4.7,4.6,4.6,4.8,4.5,4.7,4.7,4.7,4.6,4.6,4.6,4.5,4.6,4.6,4.8,4.6,4.8,4.8,4.7,4.8,4.8,4.9,4.5,4.5,4.7,4.8,4.7,4.6,4.7,4.7,4.6,4.8,4.7,4.9,4.8,4.5,4.5,4.8,4.5,4.7,4.9,4.6,4.9,4.8,4.8,4.7,4.7,4.8,4.8,4.6,4.5,4.9,4.7,4.8,4.8,4.6,4.6,4.5,4.8,4.8,4.6,4.9,4.9,4.7,4.7,4.8,4.7,4.8,4.7,4.8,4.5,4.9,4.7,4.8,4.9,4.9,4.6,4.6,4.5,4.5,4.5,4.9,4.5,4.6,4.9,4.9,4.6,4.5,4.7,4.6,4.5,4.6,4.5,4.9,4.6,4.9,4.6,4.7,4.5,4.6,4.6,4.6,4.8,4.7,4.7,4.7,4.8,4.5,4.8,4.5,4.6,4.6,4.5,4.8,4.7,4.6,4.9,4.5,4.7,4.9,4.6,4.5,4.8,4.5,4.6,4.7,4.5,4.5,4.7,4.9,4.8,4.8,4.8,4.8,4.9,4.6,4.7,4.8,4.7,4.7,4.6,4.5,4.7,4.7,4.6,4.5,4.5,4.9,4.7,4.6,4.6,4.9,4.9,4.9,4.8,4.5,4.8,4.7,4.9,4.9,4.6,4.6,4.6,4.8,4.9,4.5,4.8,4.5,4.6,4.8,4.8,4.9,4.8,4.9,4.5,4.8,4.5,4.5,4.5,4.9,4.5,4.5,4.6,4.6,4.9,4.7,4.6,4.7,4.9,4.9,4.9,4.8,4.5,4.9,4.9,4.6,4.8,4.6,4.8,4.9,4.5,4.8,4.6,4.7,4.5,4.5,4.9,4.9,4.6,4.5,4.6,4.7,4.9,4.6,4.7,4.9,4.9,4.8,4.5,4.5,4.9,4.6,4.9,4.6,4.8,4.5,4.6,4.6,4.9,4.7,4.6,4.5,4.5,4.8,4.5,4.5,4.8,4.6,4.7,4.9,4.6,4.9,4.6,4.5,4.9,4.7,4.5,4.6,4.6,4.9,4.7,4.7,4.5,4.9,4.8,4.7,4.9,4.8,4.9,4.8,4.7,4.7,4.5,4.5,4.6,4.7,4.6,4.9,4.5,4.8,4.9,4.7,4.6,4.6,4.5,4.9,4.8,4.9,4.7,4.8,4.9,4.9,4.5,4.9,4.5,4.5,4.9,4.5,4.8,4.6,4.7,4.8,4.7,4.9,4.8,4.5,4.9,4.7,4.7,4.5,4.8,4.8,4.5,4.7,4.9,4.9,4.6,4.9,4.8,4.5,4.8,4.6,4.9,4.8,4.8,4.9,4.5,4.6,4.8,4.7,4.8,4.8,4.5,4.6,4.5,4.6,4.9,4.7,4.6,4.7,4.6,4.6,4.8,4.5,4.5,4.7,4.6,4.7,4.5,4.8,4.8,4.8,4.6,4.6,4.6,4.5,4.9,4.8,4.9,4.7,4.7,4.6,4.6,4.8,4.6,4.8,4.5,4.9,4.6,4.7,4.5,4.6,4.8,4.7,4.6,4.5,4.5,4.5,4.9,4.9,4.6,4.6,4.5,4.7,4.7,4.7,4.8,4.7,4.8,4.9,4.5,4.5,4.5,4.5,4.6,4.8,4.9,4.8,4.7,4.5,4.5,4.6,4.6,4.7,4.6,4.5,4.9],[5.1,5.1,5,5,5.2,5.4,5.2,5,5.1,5.2,5.3,5,5.1,5,5.4,5.4,5.4,5,5.1,5,5,5.1,5,5.3,5.1,5,5.2,5.3,5.1,5.1,5.3,5.4,5,5.2,5,5.1,5,5.3,5.1,5.1,5.2,5.4,5.1,5.2,5.3,5.3,5.3,5.1,5,5.4,5.1,5.4,5.3,5.2,5.4,5.3,5,5,5.1,5.1,5.1,5,5,5.2,5,5.2,5,5.4,5.3,5.2,5.1,5.2,5.3,5,5.2,5.4,5,5.3,5.4,5,5.3,5.4,5.3,5.3,5.2,5,5.3,5.1,5.4,5.4,5,5.3,5.4,5.3,5,5,5,5.2,5.3,5.3,5.4,5.1,5.2,5.1,5.1,5.3,5.3,5.2,5.2,5.4,5,5.1,5.1,5,5.1,5.3,5.2,5.4,5.1,5.3,5,5.2,5.3,5,5.2,5.3,5,5.1,5.4,5.4,5,5.2,5.1,5.1,5.4,5,5,5.2,5.2,5,5.4,5,5,5.2,5.4,5.2,5.1,5,5.3,5.3,5,5.4,5.3,5.3,5.3,5.2,5.2,5.3,5,5,5,5.2,5.4,5.1,5,5.2,5.3,5.1,5.1,5.1,5.2,5.2,5.1,5.1,5,5.2,5.3,5.3,5.2,5.4,5.3,5.1,5.4,5.2,5.1,5.1,5.3,5.2,5.3,5,5.1,5,5.1,5,5.4,5.2,5.4,5,5,5.4,5.1,5.4,5.1,5.1,5.4,5.3,5.1,5.3,5,5.2,5.4,5,5.1,5.4,5,5.4,5,5.2,5.1,5.2,5.1,5.2,5.1,5.4,5.2,5.2,5.2,5,5,5.1,5.1,5.3,5.3,5.4,5.1,5.1,5.4,5.1,5.3,5.2,5,5.3,5.1,5.1,5.4,5.1,5.2,5,5.4,5.1,5.2,5.4,5.1,5.3,5.3,5.3,5,5.4,5,5.3,5,5.4,5.2,5.2,5.2,5.1,5.3,5,5.4,5.2,5.2,5,5,5.2,5.1,5.1,5,5.2,5,5,5.4,5.2,5.3,5.1,5.1,5.1,5.4,5.4,5.2,5,5.3,5,5.2,5.1,5,5.4,5.4,5.3,5.2,5,5.1,5.3,5.2,5.3,5.4,5.3,5,5.4,5.3,5.2,5.1,5.4,5.4,5.2,5.3,5,5.1,5.3,5.2,5.4,5.4,5.3,5.1,5.3,5.1,5,5,5.2,5.3,5.3,5.4,5.3,5.4,5.1,5.1,5,5.1,5.1,5.4,5.3,5.1,5.1,5,5.2,5.4,5.4,5.1,5,5.3,5.3,5.2,5.1,5.2,5.2,5.1,5.4,5,5.2,5.1,5.1,5.2,5.1,5.4,5.1,5.3,5.3,5.4,5.2,5.3,5.1,5.2,5.3,5.2,5.1,5.2,5.4,5.2,5.3,5.4,5.3],[5.9,5.5,5.6,5.7,5.7,5.6,5.7,5.7,5.5,5.6,5.9,5.5,5.6,5.7,5.5,5.6,5.9,5.7,5.8,5.9,5.9,5.7,5.7,5.9,5.7,5.9,5.9,5.6,5.5,5.6,5.7,5.7,5.6,5.7,5.7,5.7,5.9,5.7,5.5,5.9,5.8,5.9,5.6,5.9,5.6,5.8,5.8,5.5,5.7,5.6,5.7,5.9,5.8,5.6,5.5,5.9,5.5,5.9,5.5,5.9,5.6,5.8,5.7,5.7,5.6,5.5,5.5,5.8,5.7,5.6,5.5,5.9,5.8,5.6,5.7,5.8,5.9,5.9,5.8,5.8,5.7,5.8,5.5,5.7,5.6,5.6,5.9,5.8,5.5,5.5,5.6,5.5,5.9,5.8,5.6,5.6,5.8,5.7,5.6,5.5,5.9,5.9,5.6,5.7,5.7,5.8,5.9,5.7,5.9,5.7,5.9,5.5,5.7,5.5,5.5,5.8,5.6,5.6,5.7,5.5,5.5,5.9,5.5,5.7,5.9,5.9,5.7,5.5,5.5,5.8,5.8,5.5,5.8,5.5,5.8,5.9,5.6,5.6,5.5,5.6,5.7,5.6,5.8,5.9,5.9,5.8,5.6,5.8,5.9,5.7,5.9,5.6,5.9,5.5,5.7,5.9,5.6,5.5,5.9,5.7,5.9,5.6,5.6,5.9,5.5,5.5,5.6,5.5,5.8,5.8,5.8,5.9,5.5,5.8,5.5,5.9,5.8,5.7,5.6,5.6,5.6,5.5,5.9,5.7,5.9,5.8,5.9,5.6,5.7,5.5,5.6,5.8,5.7,5.7,5.5,5.5,5.6,5.6,5.5,5.5,5.8,5.5,5.9,5.8,5.5,5.9,5.8,5.6,5.6,5.7,5.6,5.5,5.5,5.6,5.9,5.7,5.9,5.9,5.8,5.9,5.9,5.9,5.8,5.6,5.7,5.7,5.6,5.7,5.8,5.9,5.9,5.6,5.6,5.7,5.8,5.8,5.8,5.8,5.6,5.8,5.5,5.6,5.5,5.6,5.9,5.7,5.9,5.8,5.7,5.8,5.5,5.9,5.8,5.8,5.5,5.5,5.6,5.7,5.8,5.8,5.8,5.5,5.9,5.9,5.8,5.9,5.7,5.9,5.7,5.5,5.5,5.7,5.7,5.5,5.7,5.5,5.9,5.7,5.8,5.7,5.5,5.6,5.5,5.5,5.9,5.9,5.9,5.5,5.9,5.9,5.5,5.6,5.7,5.8,5.6,5.8,5.9,5.9,5.9,5.6,5.6,5.6,5.6,5.9,5.8,5.9,5.7,5.5,5.9,5.9,5.9,5.8,5.9,5.6,5.5,5.8,5.9,5.9,5.5,5.7,5.6,5.8,5.5,5.5,5.6,5.7],[6.2,6.1,6.3,6.3,6,6.4,6.1,6.4,6.4,6.4,6.3,6,6.2,6.4,6.3,6.1,6.2,6.2,6.1,6.2,6,6.1,6.1,6.3,6,6,6,6.1,6,6.1,6.4,6,6.2,6.3,6.3,6,6.4,6.4,6.3,6.4,6.4,6,6.3,6.3,6.4,6.2,6.3,6,6.4,6,6.1,6,6.1,6.2,6.1,6.2,6,6.2,6.3,6,6.2,6,6.2,6.2,6.4,6,6.1,6.1,6.4,6.4,6.3,6.2,6.1,6.1,6,6.4,6.4,6.2,6,6,6.3,6.1,6.4,6.4,6.2,6.3,6,6.1,6.4,6.2,6.1,6.3,6,6,6.2,6.4,6,6.4,6.3,6.3,6.3,6.4,6.4,6.4,6.3,6.3,6.1,6.4,6.1,6,6,6,6.2,6.4,6,6.1,6.2,6,6.4,6,6.1,6.4,6,6.1,6.1,6.2,6,6,6,6,6.2,6.4,6,6.4,6.1,6.4,6.1,6.3,6.4,6,6.2,6.3,6.2,6,6.3,6,6,6.2,6.4,6.4,6.1,6,6.4,6.3,6,6.1,6.1,6.4,6.1,6.2,6.1,6,6.3,6.2,6.3,6.4,6.3,6,6.2,6.3,6.1,6.1,6.2,6,6.4,6.4,6,6.1,6,6.2,6.2,6.2,6,6.2,6.2,6.1,6.2,6,6.4,6,6,6.4,6.1,6.2,6.2,6.1,6.4,6.3,6.2,6.4,6.1,6.1,6.4,6.2,6.4,6.2,6,6.1,6.3,6.3,6.1,6,6,6.3,6.3,6.2,6,6.3],[6.7,6.5,6.7,6.6,6.9,6.5,6.7,6.9,6.9,6.5,6.6,6.6,6.6,6.9,6.8,6.6,6.5,6.8,6.9,6.9,6.6,6.7,6.9,6.6,6.5,6.8,6.7,6.9,6.8,6.6,6.6,6.8,6.5,6.9,6.5,6.6,6.6,6.6,6.8,6.7,6.9,6.9,6.9,6.5,6.8,6.6,6.6,6.9,6.8,6.7,6.5,6.6,6.6,6.5,6.9,6.8,6.9,6.9,6.9,6.5,6.8,6.6,6.9,6.7,6.8,6.7,6.9,6.8,6.7,6.7,6.7,6.7,6.7,6.7,6.7,6.9,6.8,6.9,6.9,6.5,6.9,6.8,6.6,6.6,6.8,6.5,6.5,6.5,6.8,6.8,6.7,6.7,6.8,6.7,6.9,6.5,6.6,6.6,6.9,6.8,6.8,6.6,6.7,6.9,6.6,6.8,6.6,6.8,6.8,6.9,6.9,6.6,6.7,6.5,6.5,6.5,6.8,6.8,6.9,6.6,6.9,6.8,6.8,6.8,6.5,6.7,6.5,6.5,6.5,6.7,6.9,6.8,6.6,6.7,6.8,6.5,6.7,6.7,6.7,6.9,6.8,6.9,6.6,6.8,6.7,6.6,6.6,6.6,6.8,6.6,6.5,6.5,6.8,6.6,6.7,6.6,6.5,6.7,6.6,6.8,6.9,6.6,6.8,6.7,6.8,6.8,6.8,6.7,6.7,6.6,6.6,6.9,6.5,6.7,6.7,6.9,6.9,6.5,6.6,6.5,6.8,6.7,6.5,6.6,6.6,6.5,6.6,6.5,6.5,6.7,6.7,6.9,6.5,6.8,6.8,6.5,6.7,6.8,6.6,6.8],[7.1,7.2,7.3,7.2,7,7.3,7.4,7.3,7,7.1,7.3,7.3,7.1,7.1,7.4,7.2,7.2,7,7.4,7.3,7,7.1,7.2,7.1,7.4,7,7.3,7.3,7,7.1,7.4,7.1,7.1,7.4,7.4,7,7.3,7.1,7.4,7.4,7.2,7.3,7.3,7,7.3,7.1,7.4,7.3,7.4,7,7.4,7,7.3,7.3,7.2,7,7.3,7.1,7.4,7.2,7.3,7.1,7,7.3,7.1,7.1,7.2,7.3,7,7.3,7.1,7.1,7.3,7.3,7.3,7,7,7.4,7.3,7,7.1,7.4,7.4,7.1,7.3,7.2,7.1,7.3,7,7.3,7.1,7.4,7.2,7.2,7.3,7.1,7.1,7.3,7,7,7.2,7,7.4,7.4,7.1,7.1,7.4,7.1,7.3,7,7.3,7.3,7.4,7.2,7.4,7.3,7.4,7.2,7.3,7,7.1,7.3,7.3,7.1,7.4,7.2,7.3,7.3,7,7.4,7.2,7.4,7.2,7.3,7.1,7.4,7,7,7,7],[7.9,7.7,7.6,7.6,7.7,7.9,7.7,7.9,7.9,7.6,7.5,7.6,7.7,7.5,7.7,7.6,7.6,7.5,7.6,7.9,7.5,7.8,7.5,7.8,7.5,7.7,7.5,7.5,7.9,7.9,7.6,7.6,7.9,7.7,7.7,7.8,7.7,7.8,7.9,7.6,7.8,7.7,7.6,7.6,7.7,7.9,7.5,7.9,7.8,7.6,7.8,7.8,7.6,7.7,7.5,7.9,7.5,7.7,7.7,7.7,7.5,7.7,7.8,7.5,7.7,7.9,7.7,7.8,7.5,7.5,7.6,7.8,7.6,7.6,7.9,7.7,7.6,7.9,7.5,7.5,7.7,7.8,7.6,7.6,7.7,7.9,7.5,7.6],[8.3,8.1,8.2,8,8.3,8.1,8.2,8,8.1,8.3,8.1,8.4,8.1,8.2,8.1,8.3,8.3,8.3,8.3,8.4,8,8.4,8,8.1,8.1,8.3,8.1,8.2,8.1,8,8.2,8,8.3,8,8.4,8.4,8.1,8.4,8,8,8.1,8,8.3,8.1,8.3,8,8,8.2,8.1,8.3,8,8,8.4,8.2,8,8.2,8.2,8.4,8.2,8.1,8.1,8.3,8.4,8.1,8.2,8.1,8.1,8.2],[8.6,8.6,8.7,8.5,8.7,8.9,8.6,8.9,8.6,8.6,8.5,8.6,8.8,8.7,8.5,8.5,8.9,8.5,8.7,8.8,8.6,8.5,8.9,8.8,8.5,8.5,8.6,8.5,8.8,8.5,8.5,8.5,8.6,8.7,8.7,8.9,8.5,8.5,8.5,8.5,8.6,8.8,8.5,8.9],[9.3,9.2,9.4,9.2,9,9.2,9,9,9.2,9.4,9.4,9.3,9,9.2,9.1,9,9,9.1,9.4,9.3,9.1,9.1,9.1,9.1,9.1,9.4,9.2,9.2,9.1],[9.5,9.7,9.6,9.5,9.7,9.5,9.6,9.6,9.7,9.9,9.9,9.9,9.8,9.8,9.7,9.5,9.8,9.9,9.8,9.6,9.8,9.8,9.9],[10.3,10,10.4,10.4,10.3,10.4,10.1,10.1,10,10.4,10,10,10],[10.9,10.6,10.6,10.5,10.6,10.5,10.9,10.9,10.7,10.6],[11.1,11.2,11.4,11.3,11.3,11.4,11.2,11.2,11.3],[11.8,11.5,11.7,11.6,11.8,11.8,11.9,11.7,11.5],[12,12.3,12.1,12.4,12.2,12],[12.5,12.9,12.8,12.6,12.7,12.5,12.7,12.8],[13,13.2,13.2,13.1,13.3,13.1,13,13.4,13.4,13.3,13.2],[13.9,13.6,13.7,13.7,13.8,13.7,13.7,13.6,13.8],[14.1,14.2,14.1,14.1,14.1,14.1,14.2,14.3,14.3,14.3],[14.5,14.9,14.5,14.7,14.5],[15.4,15.1,15,15.4,15,15.4,15.4,15.3],[15.7,15.8,15.6],[16.4,16.3,16.1],[16.5,16.9,16.9,16.5,16.6],[17.3,17.3],[17.9,17.8,17.7],[18.1,18.1,18],[18.7,18.8],[],[19.5,19.6],[],[20.6,20.6],[],[21.7],[],[],[23.4],[],[24.4],[],[],[],[26.4]]