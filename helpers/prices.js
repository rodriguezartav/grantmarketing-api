module.exports = async function execute(knex, clienteId, productoIds) {
  var descuentosCliente = await knex("descuentoCliente")
    .select()
    .where("clienteId", clienteId)
    .whereIn("productoId", productoIds);

  const grupos = await knex
    .table("clienteGrupo")
    .select()
    .where("clienteId", clienteId);

  const retail = await knex
    .table("grupo")
    .select()
    .where("name", "retail")
    .first();

  if (grupos.length == 0) grupos = [{ clienteId: clienteId, grupoId: retail }];

  const precios = await knex
    .table("precio")
    .select()
    .whereIn("productoId", productoIds)
    .whereIn(
      "grupoId",
      grupos.map(grupo => grupo.grupoId)
    );

  const descuentos = await knex
    .table("descuentoGrupo")
    .select()
    .whereIn("productoId", productoIds)
    .whereIn(
      "grupoId",
      grupos.map(grupo => grupo.grupoId)
    );

  var preciosByProducto = {};
  productoIds.forEach(productoId => {
    //var descuentoCliente = descuentosCliente.filter(
    // d => d.productoId == productoId
    //);
    //if (descuentoCliente[0]) preciosByProducto[productoId] = descuentoCliente;
    //else {
    var mejorPrecio = { total: 0 };
    grupos.forEach(grupo => {
      const precio = precios.filter(
        p => p.grupoId == grupo.grupoId && productoId == p.productoId
      )[0];
      const descuento = descuentos.filter(
        d => d.grupoId == grupo.grupoId && productoId == d.productoId
      )[0];
      if (precio && descuento) {
        var precioFinal =
          precio.precio - precio.precio * (descuento.descuento / 100);
        if (mejorPrecio.total < precioFinal)
          mejorPrecio = {
            total: precioFinal,
            precio: precio.precio,
            descuento: descuento.descuento
          };
      }
    });
    preciosByProducto[productoId] = mejorPrecio;
    //}
  });
  return preciosByProducto;
};

// FALTA EL QUE NO TIENE GRUPO ID
