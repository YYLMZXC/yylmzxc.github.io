'use strict';

const express = require('express');
const mods = require('../mods');

const router = express.Router();

router.get('/', function (req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, data: mods.list() });
});

module.exports = router;
