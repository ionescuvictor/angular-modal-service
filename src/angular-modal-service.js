
//  angularModalService.js
//
//  Service for showing modal dialogs.


// Modified so that we dont cache the template since thats a bad for debugging and if i change something and re-publish then guess what?
// also we need use $Injector to prevent circular comedy thing in the http interceptor
// correctly getting rid of leftover html.


angular.module('services.ModalService', []);

(function () {

    'use strict';

    // each service new module? imo bad idea.
    angular.module('services.ModalService').factory('ModalService', ['$document', '$controller', '$injector', '$rootScope', '$q',
      function ($document, $controller, $injector, $rootScope, $q) {

          //  Get the body of the document, we'll add the modal to this.
          var body = $document.find('body');

          function ModalService() {

              var self = this;

              //  Returns a promise which gets the template, either
              //  from the template parameter or via a request to the
              //  template url parameter.
              var getTemplate = function (template, templateUrl) {
                  var deferred = $q.defer();
                  if (template) {
                      deferred.resolve(template);
                  } else if (templateUrl) {

                      $injector.get('$http')({ method: 'GET', url: templateUrl, cache: false })
                      .then(function (result) {
                          // save template into the cache and return the template. Nope dont save template.
                          deferred.resolve(result.data);
                      }, function (error) {
                          deferred.reject(error);
                      });

                  } else {
                      deferred.reject("No template or templateUrl has been specified.");
                  }
                  return deferred.promise;
              };

              self.showModal = function (options) {
                
                  //  Create a deferred we'll resolve when the modal is ready.
                  var deferred = $q.defer();

                  //  Validate the input parameters.
                  var controllerName = options.controller;
                  if (!controllerName) {
                      deferred.reject("No controller has been specified.");
                      return deferred.promise;
                  }

                  //  If a 'controllerAs' option has been provided, we change the controller
                  //  name to use 'as' syntax. $controller will automatically handle this.
                  if (options.controllerAs) {
                      controllerName = controllerName + " as " + options.controllerAs;
                  }

                  //  Get the actual html of the template.
                  getTemplate(options.template, options.templateUrl)
                    .then(function (template) {

                        //  Create a new scope for the modal.
                        var modalScope = $rootScope.$new();

                        //  Create the inputs object to the controller - this will include
                        //  the scope, as well as all inputs provided.
                        //  We will also create a deferred that is resolved with a provided
                        //  close function. The controller can then call 'close(result)'.
                        //  The controller can also provide a delay for closing - this is
                        //  helpful if there are closing animations which must finish first.
                        var closeDeferred = $q.defer();
                        var inputs = {
                            $scope: modalScope,
                            close: function (result) {
                                
                                modalElement.modal('hide'); // animation then clean up the resources
                                
                                window.setTimeout(function () {
                                    //  Resolve the 'close' promise.
                                    closeDeferred.resolve(result);
                                    $(".modal-backdrop").remove();
                                    //  We can now clean up the scope and remove the element from the DOM.
                                
                                    modalScope.$destroy();

                                    //victor modification
                                    //we need to also get rid of bootstrap 'backdrop' automagically.
                                    modalElement.next().remove();
                                    modalElement.remove();

                                    //  Unless we null out all of these objects we seem to suffer
                                    //  from memory leaks, if anyone can explain why then I'd 
                                    //  be very interested to know.

                                    //victor - because 'service' is a singleton.Thats why :D

                                    inputs.close = null;
                                    deferred = null;
                                    closeDeferred = null;
                                    modal = null;
                                    inputs = null;
                                    modalElement = null;
                                    modalScope = null;
                                }, 250);
                            }
                        };

                        //  If we have provided any inputs, pass them to the controller.
                        if (options.inputs) {
                            for (var inputName in options.inputs) {
                                inputs[inputName] = options.inputs[inputName];
                            }
                        }

                        //  Parse the modal HTML into a DOM element (in template form).
                        var modalElementTemplate = angular.element(template);

                        //  Compile then link the template element, building the actual element.
                        //  Set the $element on the inputs so that it can be injected if required.
                        var linkFn = $injector.get('$compile')(modalElementTemplate);
                        var modalElement = linkFn(modalScope);
                        inputs.$element = modalElement;

                        //  Create the controller, explicitly specifying the scope to use.
                        var modalController = $controller(controllerName, inputs);

                        //  Finally, append the modal to the dom.
                        if (options.appendElement) {
                            // append to custom append element
                            options.appendElement.append(modalElement);
                        } else {
                            // append to body when no custom append element is specified
                            body.append(modalElement);
                        }
                        if (options.title) {
                            modalElement.find(".modal-title")[0].innerText = options.title;
                        }

                        //  We now have a modal object...
                        var modal = {
                            controller: modalController,
                            scope: modalScope,
                            element: modalElement,
                            close: closeDeferred.promise
                        };

                        //  ...which is passed to the caller via the promise.
                        deferred.resolve(modal);

                    })
                    .then(null, function (error) { // 'catch' doesn't work in IE8.
                        deferred.reject(error);
                    });

                  return deferred.promise;
              };

          }

          return new ModalService();
      }]);

}());
