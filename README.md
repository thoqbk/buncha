
<p align="center">
  <a href="http://gulpjs.com">
    <img height="257" src="https://raw.githubusercontent.com/thoqbk/buncha/master/docs/logo.png">
  </a>
  <p align="center">IoC Container</p>
</p>

# What is buncha?
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
var container = new require("buncha").Container();
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
var container = new require("buncha").Container();
var promise = container.scan( ["service"] );// .scan("service") is also OK.
```
We also can use `.watch()` to scan and watch all changes of services to auto reload them:
```
var container = new require("buncha").Container();
var promise = container.watch(["service"]);
```

## License
MIT

