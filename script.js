// ==UserScript==
// @name         OPS-mysql小助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description
/*
1. 优化 不用刷新页面也可以支持自动植入小助手，完成页面交互
*/
// @author       Michael.tang
// @match        http://ops.jyblife.com/*
// @require      http://libs.baidu.com/jquery/2.0.0/jquery.min.js
// @run-at       document-idle
// @compatible   Chrome
// @compatible   Firefox
// @compatible   Edge
// @compatible   Safari
// @compatible   Opera
// @compatible   UC
// @license      GPL-3.0-only
// @grant        none
// ==/UserScript==

/**
 * 监听全局ajax事件
 */
; (function() {
    if (typeof window.CustomEvent === "function") return false;

    function CustomEvent(event, params) {
        params = params || {
            bubbles: false,
            cancelable: false,
            detail: undefined
        };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
})();; (function() {
    function ajaxEventTrigger(event) {
        var ajaxEvent = new CustomEvent(event, {
            detail: this
        });
        window.dispatchEvent(ajaxEvent);
    }

    var oldXHR = window.XMLHttpRequest;

    function newXHR() {
        var realXHR = new oldXHR();

        realXHR.addEventListener('abort',
        function() {
            ajaxEventTrigger.call(this, 'ajaxAbort');
        },
        false);

        realXHR.addEventListener('error',
        function() {
            ajaxEventTrigger.call(this, 'ajaxError');
        },
        false);

        realXHR.addEventListener('load',
        function() {
            ajaxEventTrigger.call(this, 'ajaxLoad');
        },
        false);

        realXHR.addEventListener('loadstart',
        function() {
            ajaxEventTrigger.call(this, 'ajaxLoadStart');
        },
        false);

        realXHR.addEventListener('progress',
        function() {
            ajaxEventTrigger.call(this, 'ajaxProgress');
        },
        false);

        realXHR.addEventListener('timeout',
        function() {
            ajaxEventTrigger.call(this, 'ajaxTimeout');
        },
        false);

        realXHR.addEventListener('loadend',
        function() {
            ajaxEventTrigger.call(this, 'ajaxLoadEnd');
        },
        false);

        realXHR.addEventListener('readystatechange',
        function() {
            ajaxEventTrigger.call(this, 'ajaxReadyStateChange');
        },
        false);

        return realXHR;
    }

    window.XMLHttpRequest = newXHR;
})();

(function() {
    'use strict';

    var $ = $ || window.$;

    var checkUrl = function() {
        var reg = /^http?:\/\/ops\.jyblife\.com\/#\/querypage*$/;
        var reg1 = /^http?:\/\/ops\.jyblife\.com\/#\/order\/serach-sql*$/;
        if (!reg.test(location.href) && !reg1.test(location.href)) {
            return false;
        }
        return true;
    };

    //sql页面锁
    var sqlPageLock = true;

    //是否树形展示
    var treeShowBol = false;

    var checkFormatEnter = function(str) {
        if (str.indexOf("Create Table") > -1 && str.indexOf("CREATE TABLE `") > -1) {
            return true;
        }
        return false;
    };

    //组装树形数据 new
    var newJoinTreeData = function(responseText) {
        var keyList = [];

        var i = 0;
        for (i = 0; i < responseText['title'].length; i++) {
            keyList.push(responseText['title'][i]['title']);
        }

        var valList = [];
        for (i = 0; i < responseText['data'].length; i++) {
            valList.push(responseText['data'][i]);
        }

        var fullArr = [];

        for (i = 0; i < valList.length; i++) {
            var tmpRow = valList[i];
            var tmpMap = {};
            for (var j = 0; j < keyList.length; j++) {
                tmpMap[keyList[j]] = tmpRow[keyList[j]];
            }
            fullArr.push(tmpMap);
        }
        return fullArr;
    };

    //组装树形数据
    var joinTreeData = function() {
        var keyList = [];
        $('.ivu-table-wrapper table thead tr th span').each(function() {
            keyList.push($(this).html());
        });
        var valList = [];

        $('.ivu-table-body table tbody tr').each(function() {
            var tmpArr = [];
            $(this).find('td span').each(function() {
                tmpArr.push($(this).html());
            });
            valList.push(tmpArr);
        });
        var fullArr = [];

        for (var i = 0; i < valList.length; i++) {
            var tmpList = valList[i];
            var tmpMap = {};
            for (var j = 0; j < tmpList.length; j++) {
                tmpMap[keyList[j]] = tmpList[j];
            }
            fullArr.push(tmpMap);
        }
        return fullArr;
    };

    //展示树形结构数据
    var showTreeFunc = function(data) {
        try {
            $("#out_pre").remove();
        } catch(e) {};
        $('.ivu-table-wrapper').css({
            display: "none"
        });
        $('.ivu-table-wrapper').after('<pre id="out_pre" style="color:#00FF7F;background-color:black;"></pre>');

        var fullArr = newJoinTreeData(data);
        //var fullArr = joinTreeData();
        if (checkFormatEnter(JSON.stringify(data))) {
            $('#out_pre').html(JSON.stringify(fullArr, null, 2) + "\n\n\n\n共：" + data.len + "条结果");
        } else {
            $('#out_pre').text(JSON.stringify(fullArr, null, 2) + "\n\n\n\n共：" + data.len + "条结果");
        }
    };

    //展示普通结构数据
    var showNormalFunc = function() {
        try {
            $("#out_pre").remove();
        } catch(e) {};
        $('.ivu-table-wrapper').css({
            display: "block"
        });
    };

    var init = function() {
        if(!sqlPageLock) {
            return false;
        }
        sqlPageLock = false;

        if($('.reset-row-show').length <= 0) {
            //事件触发
            $('.ivu-card-body button').last().after('<button style="margin-left:5px;" type="button" class="ivu-btn ivu-btn-primary tree-show"><!----> <i class="ivu-icon ivu-icon-md-backspace"></i> <span>JSON展示&查询</span></button>');
            //事件触发
            $('.ivu-card-body button').last().after('<button style="margin-left:5px;" type="button" class="ivu-btn ivu-btn-primary reset-row-show"><!----> <i class="ivu-icon ivu-icon-md-backspace"></i> <span>重置为行展示&查询</span></button>');

            //事件触发
            $('.ivu-card-body button').last().after('<button style="margin-left:5px;" type="button" class="ivu-btn ivu-btn-primary full-screen"><!----> <i class="ivu-icon ivu-icon-md-backspace"></i> <span>全屏</span></button>');
        }



        //点击分页按钮也触发JSON展示
        $('body').undelegate('.ivu-page li', 'click');
        $('body').delegate('.ivu-page li', 'click',
        function() {
            if (treeShowBol) {
                showNormalFunc();
                //showTreeFunc();
                //setTimeout(function (){showTreeFunc();},500);
            }
        });

        $('body').undelegate('.tree-show', 'click');
        $('body').delegate('.tree-show', 'click',
        function() {
            treeShowBol = true;
            $('.ivu-card-body .ivu-btn.ivu-btn-success').trigger('click');
        });

        //普通展示
        $('body').undelegate('.ivu-card-body .ivu-btn.ivu-btn-success', 'click');
        $('body').delegate('.ivu-card-body .ivu-btn.ivu-btn-success', 'click',
        function() {
            try {
                $("#out_pre").remove();
            } catch(e) {};
            $('.ivu-table-wrapper').css({
                display: "block"
            });
            //分页组件展示
            $('.ivu-page').css('display', 'block');
        });

        $('body').undelegate('.reset-row-show', 'click');
        $('body').delegate('.reset-row-show', 'click',
        function() {
            treeShowBol = false;
            $('.ivu-card-body .ivu-btn.ivu-btn-success').trigger('click');
        });

        //全屏展示
        $('body').undelegate('.full-screen', 'click');
        $('body').delegate('.full-screen', 'click',
        function() {
            if ($(this).find('span').text() == '全屏') {

                $('.main-header-con').css('display', 'none');
                $('.sidebar-menu-con').css('display', 'none');
                $('.ivu-col.ivu-col-span-6').css({
                    display: "none"
                });
                //隐藏数据库树菜单
                $('.edittable-test-con').css({
                    display: "none"
                });

                $('.single-page-con').css({
                    "padding": "0px"
                });
                $('.main-header').css({
                    "padding": "0px"
                });

                $('.ivu-card.ivu-card-bordered').css({
                    width: "2080px"
                });

                $(this).find('span').text('取消全屏');
            } else {
                $('.main-header-con').css('display', 'block');
                $('.sidebar-menu-con').css('display', 'block');
                $('.ivu-col.ivu-col-span-6').css({
                    display: "block"
                });
                $('.edittable-test-con').css({
                    display: "block"
                });
                $('.single-page-con').css({
                    "padding": ""
                });
                $('.single-page-con').css({
                    "padding-left": "200px"
                });
                $('.main-header').css({
                    "padding": ""
                });
                $('.ivu-card.ivu-card-bordered').css({
                    width: ""
                });
                $(this).find('span').text('全屏');
            }
        });
        sqlPageLock = true;
    };

    var xhr = new XMLHttpRequest();

    //监听全局的ajax完成事件
    window.addEventListener('ajaxReadyStateChange',
    function(e) {
        //console.log(e.detail);
        //如果加载完成
        if (e.detail.readyState == 4) {
            if (/^http?:\/\/ops\.jyblife\.com:\d*\/api\/v\d+\/search$/.test(e.detail.responseURL)) {
                if (e.detail.responseText) {
                    if (treeShowBol) {
                        var responseText = e.detail.responseText;
                        if (checkFormatEnter(responseText)) {
                            responseText = e.detail.responseText.replace(/\\n/g, "<br />&nbsp;&nbsp;&nbsp;&nbsp;");
                        }
                        responseText = JSON.parse(responseText);
                        showTreeFunc(responseText);
                        $('.ivu-page').css('display', 'none');
                    }

                }
            }else if(/^http?:\/\/ops\.jyblife\.com:\d*\/api\/v\d+\/query_worklf/.test(e.detail.responseURL)) {//检查页面
                if(checkUrl()) {
                    $("body").unbind('DOMNodeInserted').one("DOMNodeInserted", function (e){
                        e.stopPropagation();
                        init();
                    });
                }
            }
        }
    });
    window.addEventListener('ajaxAbort',
    function(e) {
        //console.log(e.detail.responseText); // XHR 返回的内容
    });



})();
