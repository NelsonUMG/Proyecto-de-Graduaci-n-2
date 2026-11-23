const ok = (res, data, message = 'Operacion realizada correctamente') => {
  res.json({ ok: true, message, data });
};

const created = (res, data, message = 'Registro creado correctamente') => {
  res.status(201).json({ ok: true, message, data });
};

module.exports = {
  ok,
  created,
};
