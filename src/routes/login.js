import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import cookie from 'cookie';
import fs from 'fs'

let router = Router();
require('dotenv').config();

const PrivateKEY = fs.readFileSync('./src/config/jwtRS256.key', 'utf8');

router
  .route('/')
  .get((req, res) => {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    return res.send(
      "<div><h1>Forbidden</h1><div>You don't have permission to access this resource</div></div>"
    );
  })
  .post(async (req, res) => {
    const { email, password, remember_me } = req.body;

    if (!email || !password) {
      return res.status(403).json({
        error: 'Forbidden',
      });
    }

    try {
      const { rows } = await query('SELECT * FROM accounts WHERE email = $1', [
        email,
      ]);

      const results = rows[0];

      if (results && results.is_active) {
        /* Define variables */
        const { account_uid, first_name, last_name, email, password_hash, privileges } = results
        /* Check and compare password */
        bcrypt.compare(password, password_hash).then((isMatch) => {
          /* User matched */
          if (isMatch) {
            /* Create JWT Payload */
            const payload = {
              account_uid,
              first_name,
              last_name,
              email,
              privileges,
            };
            // Sign Options
            const SignOptions = {
              expiresIn: remember_me ? '7d' : '1d',
              algorithm: "RS256"
            }
            /* Sign token */
            jwt.sign(
              payload,
              PrivateKEY,
              SignOptions,
              (err, token) => {
                if (err) {
                  res.status(400).json({
                    message: 'There was a problem with your Token.',
                  });
                }
                res.setHeader(
                  'set-Cookie',
                  cookie.serialize('DGALA-TOKEN', token, {
                    httpOnly: true,
                    secure: true,
                    maxAge: remember_me ? (7 * 86400) : (86400),
                    sameSite: 'Strict',
                    path: '/',
                  })
                );
                console.log('token :>> ', token);
                res.status(200).json({
                  success: true,
                });
              }
            );
          } else {
            res
              .status(403)
              .json({ message: 'Password incorrect' });
          }
        });
      } else if (!results) {
        res.status(400).json({
          message: 'User not found.',
        });
      } else if (!results.is_active) {
        res.status(400).json({
          message: 'User is not active.',
        });
      }
    } catch (error) {
      console.log('error :>> ', error);
      res.status(500).json({
        success: false,
        message: 'Oops! something went wrong.',
      });
    }
  });

module.exports = router;