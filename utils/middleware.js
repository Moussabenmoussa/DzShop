module.exports = {
    isAuth: (req, res, next) => {
        if (req.session.userId) {
            next(); // مسموح بالمرور
        } else {
            res.redirect('/'); // مطرود إلى صفحة الدخول
        }
    }
};
