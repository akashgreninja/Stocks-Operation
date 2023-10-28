/**
 * @dev THIS PAGE IS BROKEN FIXING IT 
 */


const nodemailer = require('nodemailer');


function sendEmail(message) {
  return new Promise((res, rej) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'akashuhulekal@gmail.com',
        pass: process.env.PASS
      }
    })

    transporter.sendMail(message, function(err, info) {
      if (err) {
        rej(err)
      } else {
        res(info)
      }
    })
  })
}

const sendConfirmationEmail = function({toUser}) {
  const message = {
    from: process.env.GOOGLE_USER,
    // to: toUser.email // in production uncomment this
    to:toUser,
    subject: 'Let`Stock - Activate Account',
    html: `
      <h3> Hello ${toUser} </h3>
      <p>Thank you for registering into our Application. Much Appreciated! Just one last step is laying ahead of you...</p>
      <p>To activate your account please follow this link: <a target="_" href="${process.env.DOMAIN}/api/auth/activate?email=${toUser}">/activate </a></p>
      <p>Cheers</p>
      <p>Let'Stock Application Team</p>
    `
  }

  return sendEmail(message);
}

const sendResetPasswordEmail = ({toUser, hash}) => {
  const message = {
    from: process.env.GOOGLE_USER,
    // to: toUser.email // in production uncomment this
    to: toUser,
    subject: 'Let`Stock - Reset Password',
    html: `
      <h3>Hello ${toUser} </h3>
      <p>To reset your password please follow this link: <a target="_" href="https://letstock-2bc58.web.app/Resetpass?email=${toUser}">Reset Password Link</a></p>
      <p>this is your one time password for resetting the password ---<button>${hash}</button> </p>
      <p>Cheers,</p>
      <p>Let'Stock Application Team</p>
    `
  }

  return sendEmail(message);
}

module.exports={sendConfirmationEmail,sendResetPasswordEmail};