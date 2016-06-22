function (user, context, callback) {
    var email_list = [
    ];
    if (user.email && email_list.indexOf(user.email) > -1) {
        return callback(null, user, context);
    }
    return callback(new UnauthorizedError('Access denied.'));
}