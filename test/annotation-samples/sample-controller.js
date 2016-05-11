/**
 * @Controller(name="SampleController")
 * 
 * Sample controller
 * @param {type} userService description
 */

module.exports = SampleController;

function SampleController(userService, $logger) {

    /**
     * 
     * @param {type} $input containing request data and sender info
     * @param {type} $response description
     * @returns {undefined}
     */
    this.hello = function ($input, $response) {
        var senderId = $input.getUserId();
        return userService.get(senderId)
                .then(function (user) {
                    if ($input.get("deviceId") != "microsoft") {
                        var message = "Receive message from " + senderId;
                        message += ". Hello " + user.username + ", this is SampleController";
                        $response.echo({
                            id: $input.getId(),
                            type: "result",
                            action: "io:cloudchat:message:create",
                            body: message
                        });
                    }
                    $logger.debug("This is hello action!");
                });
    };

}