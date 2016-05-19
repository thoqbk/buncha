<p align="center">
    <img height="257" src="https://raw.githubusercontent.com/thoqbk/buncha/master/docs/logo.jpg"/>
    <p align="center">IoC Container</p>
</p>



## What is buncha?
- **IoC Container** - Buncha is essential package to building a powerful, large application
- **Invoke functions and construct object** - Buncha will find the correct arguements automatically to invoke your functions or construct an object from your class.
- **Dependency manager** - Manage dependencies of services in container. Auto detect dependency cycle.
- **Annotation scanner** - Buncha uses @Service annotation to detect services in your projects.
- **Watch File Changes and Auto Reload** - `You hate restarting your application anytime you modify a file?` Buncha detects changes and reload it and all dependents for you automatically.

## Install
```
$ npm install --save buncha
```
## Register services manually
```
//Declare services
var userService = function () {
    //...
}
var ReportService = function (userService) {
    //...
}
//Register services. The registration order is NOT important
var container = new (require("buncha")).Container();
container.registerByConstructor("reportService", ReportService);
container.register("userService", userService);
```
## Invoke function and construct an object
```
function generateReport (userService, reportService) {
    //...
}

function Report (reportService, userService, type){
    //...
}

//Buncha finds correct aurguements to invoke the function
var report1 = container.invoke(generateReport);

//Add missingResolver {type:"pdf"}. Missingresolver can be a function(parameterName){}
var report2 = container.construct(Report, {type:"pdf"});
```

## Using service annotation to declare a service
Create file name `service/order-service.js` with annotation @Service in multi-line comment block
```
/**
 * @Service(name="orderService")
 *
**/
module.exports = OrderService;
function OrderService (userService, reportService) {
    //...
}
```
Use `buncha` to scan all services in `service` directory
```
var container = new (require("buncha").Container)();
var promise = container.scan( ["service"] );// .scan("service") is also OK.
```
We can also use `.watch()` to scan and watch all changes of services to auto reload them:
```
var container = new (require("buncha").Container)();
var promise = container.watch(["service"]);
```

## Function utility
```
function hello(name, age){
    //...
}
var User = function(name, age){
    this.getName = function(){
        return name;
    }
    this.getAge = function(){
        return age;
    }
}
var user = new User("Tom", 10);

var Fx = require("buncha").Fx;
var parameters = Fx.extractParameters( hello ); //return array of strings "name", "age"
var methods = Fx.extractMethodNames( user ); //return array of strings "getName", "getAge"
var annotations = Fx.extractAnnotations( fileContentInString ); //return all annotations

```


## License
MIT