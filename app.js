var express=require("express");
var app=express();
var bodyParser=require("body-parser");
var passport=require("passport");
var LocalStrategy=require("passport-local");
var mongoose=require("mongoose");
var User=require("./models/user");
var Comment=require("./models/comment");
var Campground=require("./models/campground");
var seedDB=require("./seeds");
var methodoverride=require("method-override");
var flash=require("connect-flash");
// comment out seed
// seedDB();

mongoose.connect("mongodb://localhost/yelp_camp11", {useNewUrlParser: true, useUnifiedTopology: true});
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(methodoverride("_method"));

app.use(flash());

//Passport Configuration
app.use(require("express-session")({
	secret:"Secret",
	resave:false,
	saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

//for navbar session to pass user and now for flash messages also	
app.use(function(req,res,next){
	res.locals.currentUser=req.user;
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
});

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/*Campground.create({
	name:"Mountain Goat's Rest",
	image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTn2GlMoIm3QXfUhAMTLcKGcENGpL42hC4c4n5_lQ4H3JDTarhjTg",
	description:"This is a huge campground.No water, no bathrooms"
},function(err,campground){
	if(err)
		{console.log(err)}
	else{
		console.log("New created Campground:");
		console.log(campground);
	}
});
*/

app.get("/",function(req,res){
	res.render("landing.ejs");
})
app.get("/campgrounds",function(req,res){
	Campground.find({},function(err,AllCampground){
		if(err)
			console.log(err);
		else
			{
				res.render("index.ejs",{campgrounds:AllCampground});
			}
	})
});

app.post("/campgrounds",isLoggedIn,function(req,res){
	var name=req.body.name;
	var image=req.body.image;
	var desc=req.body.description;
	var author={
		id:req.user._id,
		username:req.user.username	
	};
	var newcampground={name:name,image:image,description:desc,author:author};
	Campground.create(newcampground,function(err,newlycreated){
		if(err)
			console.log(err);
		else
			res.redirect("/campgrounds");
	})	
})

app.get("/campgrounds/new",isLoggedIn,function(req,res){
	res.render("new.ejs");
})

app.get("/campgrounds/:id",function(req,res){
	Campground.findById(req.params.id).populate("comments").exec(function(err,foundCampground){
		if(err)
			console.log(err);
		else
			{
				res.render("show.ejs",{campground:foundCampground});
			}
	})
	
});

app.get("/campgrounds/:id/comments/new",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err)
			console.log(err);
		else{
			res.render("newcomment.ejs",{campground:campground});
		}
	});
	
});

app.post("/campgrounds/:id/comments",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err){
			console.log(err);
			res.redirect("/campgrounds");
		}
		else{
			Comment.create(req.body.comment,function(err,comment){
				if(err){
					console.log(err);
				}
				else{
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					comment.save();
					campground.comments.push(comment);
					campground.save();
					req.flash("success","Successfully created comment");
					res.redirect("/campgrounds/"+campground._id);
				}
			});
		}
});
});

//Auth Routes
app.get("/register",function(req,res){
	res.render("register.ejs");
});

app.post("/register",function(req,res){
	User.register(new User({username:req.body.username}),req.body.password,function(err,user){
		if(err)
			{
				req.flash("error",err.message);
				return res.render("register.ejs");
			}
		passport.authenticate("local")(req,res,function(){
			req.flash("success","Welcome to Yelpcamp "+user.username);
			res.redirect("/campgrounds");
		})
	});
});

//Login form
app.get("/login",function(req,res){
	res.render("login.ejs");
});

app.post("/login",passport.authenticate("local",{
	successRedirect:"/campgrounds",
	failureRedirect:"/login"
}),function(req,res){	
});

//logout route
app.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logged you out");
	res.redirect("/campgrounds");
});

//edit campground route
app.get("/campgrounds/:id/edit",checkcampgroundownership,function(req,res)
{
		Campground.findById(req.params.id,function(err,foundcampground)
		{
				res.render("edit.ejs",{campground:foundcampground});
		});
});

//update campground route
app.put("/campgrounds/:id",checkcampgroundownership,function(req,res){
	// find and update the campground
	Campground.findByIdAndUpdate(req.params.id,req.body.campground,function(err,updatedcampground){
		if(err)
		res.redirect("/campgrounds");
		else
		res.redirect("/campgrounds/"+ req.params.id);
	});
});

//destroy campground route
app.delete("/campgrounds/:id",checkcampgroundownership,function(req,res){
	Campground.findByIdAndRemove(req.params.id,function(err){
		if(err)
		res.redirect("/campgrounds");
		else
		res.redirect("/campgrounds");
	});
});

//edit comment
app.get("/campgrounds/:id/comments/:comment_id/edit",checkcommentownership,function(req,res){
	Comment.findById(req.params.comment_id,function(err,foundComment){
		if(err){
			res.redirect("back");
		} else
		{
			res.render("editcomment.ejs",{campgroundid:req.params.id,comment:foundComment});
		}
	});
});

//comment update
app.put("/campgrounds/:id/comments/:comment_id",checkcommentownership,function(req,res){
	Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updatedcomment){
		if(err)
		res.redirect("back");
		else
		{
			req.flash("success","Comment updated");
			res.redirect("/campgrounds/"+req.params.id);
		}
	});
});

//comment delete
app.delete("/campgrounds/:id/comments/:comment_id",checkcommentownership,function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id,function(err){
		if(err)
		res.redirect("back");
		else
		{
			req.flash("success","Comment deleted");
			res.redirect("/campgrounds/"+req.params.id);
		}
	});
});

//middleware
function isLoggedIn(req,res,next){
 if(req.isAuthenticated()){
	return next(); 
 }	
 	req.flash("error","You need to be logged in to that");
	res.redirect("/login");
};

//middleware 2
function checkcampgroundownership(req,res,next){
	if(req.isAuthenticated()){
		Campground.findById(req.params.id,function(err,foundcampground){
			if(err){
				req.flash("error","Campground not found");
				res.redirect("back");
			}		
			else{
				// does the user own the campground
				if(foundcampground.author.id.equals(req.user._id))
					next();
				else
				{
					req.flash("error","You don't have permission to do that");
					res.redirect("back");
				}
			}
		});
	}
	else{
		req.flash("error","You need to be logged in to that");
		res.redirect("back");
	}
};

//middleware 3
function checkcommentownership(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id,function(err,foundcomment){
			if(err)
				res.redirect("back");
			else{
				// does the user own the comment
				if(foundcomment.author.id.equals(req.user._id))
					next();
				else
				{
					req.flash("error","You don't have permission to do that");
					res.redirect("back");
				}
			}
		});
	}
	else{
		req.flash("error","You need to be logged in to do that");
		res.redirect("back");
	}
};

app.listen(3000,function()  {
	console.log("Server on 3000 port");
});