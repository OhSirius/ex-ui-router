angular.module('crmUtilsApp')
.provider('stringHelper', function () {
    var replaceAll = function(find, replace, str) {
        var re = new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        str = str.replace(re, replace);
        return str;
    };

    var equals = function(str1, str2) {
        if (!str1 && !str2)
            return true;

        return str1 === str2;
    };

    var startWith = function (str, subStr) {
        return !!str && !!subStr && str.indexOf(subStr) === 0;
    };

    var contains = function (str, subStr) {
        return !!str && !!subStr && str.indexOf(subStr) > -1;
    };

    return {
        replaceAll: function(find, replace, str) {
            return replaceAll(find, replace, str);
        },
        equals : function(str1, str2) {
            return equals(str1, str2);
        },
        startWith: function (str, subStr) {
            return startWith(str, subStr);
        },
        contains: function(str, subStr) {
            return contains(str, subStr);
        },
        $get:[function() {
            return {
                replaceAll: function (find, replace, str) {
                    return replaceAll(find, replace, str);
                },
                equals: function (str1, str2) {
                    return equals(str1, str2);
                },
                startWith: function (str, subStr) {
                    return startWith(str, subStr);
                },
                contains: function (str, subStr) {
                    return contains(str, subStr);
                },

            };
        }]
    };
})