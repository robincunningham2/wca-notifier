import nodemailer from 'nodemailer';

const sendEmail = async (auth: string, text: string, html: string) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: auth.split(':')[0],
            pass: auth.split(':')[1],
        },
    });

    await transporter.verify();

    return await transporter.sendMail({
        from: `WCA Notifier <${auth.split(':')[0]}>`,
        to: 'robinmichaelcunningham@gmail.com',
        subject: 'New WCA Competition!',
        text,
        html,
    }).catch(() => null);
};

export { sendEmail };
