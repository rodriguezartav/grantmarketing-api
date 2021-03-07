const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");
const getKnex = require("../../helpers/mysql");
const { Parser } = require("json2csv");
const request = require("superagent");

let knex;

module.exports = async function Run(integrationMap) {
  try {
    const conn = await sfConn(integrationMap["salesforce"]);

    knex = await getKnex(integrationMap["mysql"]);

    var movimientoInventarios = await knex
      .table("movimientoInventario")
      .select(
        "documento.consecutivo",
        "movimientoInventario.fecha",
        "movimientoInventario.cantidad",
        "movimientoInventario.precio",
        "movimientoInventario.descuento",
        "movimientoInventario.impuesto",
        "movimientoInventario.total",
        "movimientoInventario.costo",
        "producto.name as producto_nombre",
        "producto.codigo as producto_codigo",
        "cliente.name as cliente_nombre",
        "cliente.cedula as cliente_cedula"
      )
      .leftJoin("producto", "producto.id", "movimientoInventario.productoId")
      .join("documento", "documento.id", "movimientoInventario.documentoId")
      .leftJoin("cliente", "cliente.id", "documento.clienteId")
      .where("movimientoInventario.tipo", "FA");

    let movimientos = await query(
      conn,
      "select id,consecutivo__c, codigo_producto__c from movimiento__c where fecha__c < 2019-12-20"
    );

    const movimientosMap = {};
    movimientos.forEach((item) => {
      movimientosMap[
        item.consecutivo__c + "_" + item.codigo_producto__c
      ] = item;
    });

    movimientoInventarios = movimientoInventarios
      .filter((movimiento) => {
        return !movimientosMap[
          movimiento.consecutivo + "_" + movimiento.producto_codigo
        ];
      })
      .map((item) => {
        return {
          consecutivo__c: item.consecutivo + "_" + item.producto_codigo,
          external_id__c:
            "MYSQL_" + item.consecutivo + "_" + item.producto_codigo,
          total__c: parseFloat(item.total),
          cantidad__c: parseFloat(item.cantidad),
          precio__c: parseFloat(item.precio),
          costo__c: parseFloat(item.costo),
          impuesto__c: parseFloat(item.impuesto),
          descuento__c: parseFloat(item.descuento),
          codigo_producto__c: item.producto_codigo,
          producto_nombre__c: item.producto_nombre,

          fecha__c: moment(item.fecha).format("YYYY-MM-DD"),
        };
      });

    await bulk(
      conn,
      "Movimiento__c",
      "upsert",
      "external_id__c",
      movimientoInventarios
    );
  } catch (e) {
    console.log(e);
    throw e;
  }
};
