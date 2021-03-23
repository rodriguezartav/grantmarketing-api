function process(data, updatePositions) {
  console.log(data);

  if (data.event == "fill" || data.event == "partial_fill")
    updatePositions({
      symbol: stock.symbol,
      price: data.price,
      quantity: data.position_qty,
      timestamp: data.timestamp,
    });
}

module.exports = process;

/*

console.log(data);
*/
