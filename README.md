<p align="center">
    <img height="257" src="https://raw.githubusercontent.com/thoqbk/buncha/master/docs/logo.jpg"/>
    <p align="center">IoC Container. Inspired by <a href="http://spring.io/">Spring Framework</a></p>
</p>



## What is buncha?
- **IoC Container** - Buncha is essential package to building a powerful, large application
- **Invoke function and construct object** - Buncha will find the correct arguments automatically to invoke your functions or construct an object from your class.
- **Dependency manager** - Manage dependencies of services in container. Auto detect dependency cycle.
- **Annotation scanner** - Buncha uses @Service annotation to detect services in your projects.
- **Watch File Changes and Auto Reload** - `You hate restarting your application anytime you modify a file?` Buncha detects changes and reload it and all dependents for you automatically.

## Install
```
$ npm install --save buncha
```
## Register services manually
```js
//Declare services
var userService = function () {
    //...
}
var ReportService = function (userService) {
    //...
}
//Register services. The registration order is NOT important
var container = new (require("buncha").Container)();
container.registerByConstructor("reportService", ReportService);
container.register("userService", userService);

//Get service by name
var reportService = container.resolve("reportService");
var services = container.resolve(["reportService", "userService"])
```
## Invoke function and construct an object
```js
function generateReport (userService, reportService) {
    //...
}

function Report (reportService, userService, type){
    //...
}

//Buncha finds correct arguments to invoke the function
var report1 = container.invoke(generateReport);

//Add missingResolver {type:"pdf"}
//Missingresolver can be a function(parameterName){}
var report2 = container.construct(Report, {type:"pdf"});
```

## Using service annotation to declare a service
Create file `service/order-service.js` with annotation @Service in multi-line comment block
```js
/**
 * @Service(name="orderService")
 *
 */
module.exports = OrderService;
function OrderService (userService, reportService) {
    //...
}
```

## Scan and watch

Use `buncha` to scan all services in `service` directory
```js
var container = new (require("buncha").Container)();
var promise = container.scan( ["service"] );// .scan("service") is also OK.
```
We can also use `.watch()` to scan and watch all changes of services to auto reload them:
```
var container = new (require("buncha").Container)();
var promise = container.watch(["service"]);
```

## Default services in IoC container:
- $construct
- $invoke
- $register
- $registerByConstructor
- $resolve
- $resolveByAnnotation

## Function utility
```js
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
var parameters = Fx.extractParameters( hello ); //return ["name", "age"]
var methods = Fx.getMethodNames( user ); //return ["getName", "getAge"]
var annotations = Fx.extractAnnotations( fileContentInString ); //return all annotations

```

## Author
Tho Q Luong [thoqbk.github.io](http://thoqbk.github.io/)

## License
MIT