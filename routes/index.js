
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Data Engineering: Task 3', countryDict: countryDict });
};


