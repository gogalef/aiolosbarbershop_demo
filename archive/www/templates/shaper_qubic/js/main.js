/**
 * @package Helix3 Framework
 * @author JoomShaper http://www.joomshaper.com
 * @copyright Copyright (c) 2010 - 2022 JoomShaper
 * @license http://www.gnu.org/licenses/gpl-2.0.html GNU/GPLv2 or later
 */
jQuery(function ($) {

    var $body = $('body'),
            $wrapper = $('.body-innerwrapper'),
            $toggler = $('#offcanvas-toggler'),
            $close = $('.close-offcanvas'),
            $offCanvas = $('.offcanvas-menu');

    $toggler.on('click', function (event) {
        event.preventDefault();
        stopBubble(event);
        setTimeout(offCanvasShow, 50);
    });

    $close.on('click', function (event) {
        event.preventDefault();
        offCanvasClose();
    });

    var offCanvasShow = function () {
        $body.addClass('offcanvas');
        $wrapper.on('click', offCanvasClose);
        $close.on('click', offCanvasClose);
        $offCanvas.on('click', stopBubble);

    };

    var offCanvasClose = function () {
        $body.removeClass('offcanvas');
        $wrapper.off('click', offCanvasClose);
        $close.off('click', offCanvasClose);
        $offCanvas.off('click', stopBubble);
    };

    var stopBubble = function (e) {
        e.stopPropagation();
        return true;
    };

    //Mega Menu
    $('.sp-megamenu-wrapper').parent().parent().css('position', 'static').parent().css('position', 'relative');
    $('.sp-menu-full').each(function () {
        $(this).parent().addClass('menu-justify');
    });

    // //menu after slideshow
    // $(document).ready(function(){
    //     // if has slideshow then add class
    //     if ($("body.com-sppagebuilder #sp-page-builder .sppb-slider-fullwidth-wrapper").length) {
    //         $("#sp-header").addClass('has-slideshow');
    //     }
    // });


    // has slideshow
    $(document).ready(function () {
        var spHeader = $("#sp-header");
        if ($("body.com-sppagebuilder #sp-page-builder .sppb-slider-wrapper").length) {
            spHeader.addClass('has-slideshow');
        }
        // class in header
        spHeader.addClass('menu-fixed-out');
    });

    // Add class menu-fixed when scroll
    var windowWidth = $(window).width();
    // Menu Fixed

    var stickyNavTop = $('#sp-header').offset().top;

    var stickyNav = function () {
        var scrollTop = $(window).scrollTop();

        if (scrollTop > stickyNavTop) {
            $('#sp-header').removeClass('menu-fixed-out')
                    .addClass('menu-fixed');
        } else
        {
            if ($('#sp-header').hasClass('menu-fixed'))
            {
                $('#sp-header').removeClass('menu-fixed').addClass('menu-fixed-out');
            }

        }
    };

    stickyNav();

    $(window).scroll(function () {
        stickyNav();
    });



    // Input effect

    (function () {
        // trim polyfill : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
        if (!String.prototype.trim) {
            (function () {
                // Make sure we trim BOM and NBSP
                var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
                String.prototype.trim = function () {
                    return this.replace(rtrim, '');
                };
            })();
        }

        [].slice.call(document.querySelectorAll('input.input-field, textarea.input-field')).forEach(function (inputEl) {
            // in case the input is already filled..
            if (inputEl.value.trim() !== '') {
                classie.add(inputEl.parentNode, 'input_filled');
            }

            // events:
            inputEl.addEventListener('focus', onInputFocus);
            inputEl.addEventListener('blur', onInputBlur);
        });

        function onInputFocus(ev) {
            classie.add(ev.target.parentNode, 'input_filled');
        }

        function onInputBlur(ev) {
            if (ev.target.value.trim() === '') {
                classie.remove(ev.target.parentNode, 'input_filled');
            }
        }
    })();


    $('.offcanvas-inner ul > li:not(.no-scroll) > a').on('click', function () {
        $('body').removeClass('offcanvas');
    });

    // ******* Menu link ******** //
    var homeSectionId = $('#sp-page-builder > .page-content > *:first-child').attr('id');   // home section id

    //if (homeSectionId) { var homeSectionId = homeSectionId } else { var homeSectionId = onePageUrl }

    $('.sp-megamenu-wrapper ul, .nav.menu').find('li:not(".no-scroll")').each(function (i, el) {
        var $that = $(this),
        $anchor = $that.children('a'),
        url = $anchor.attr('href'),
        splitUrl = url.split('#');

        if ($that.hasClass('home')) {
            if (homeSectionId && $('body').hasClass('home')) {
                $anchor.attr('href', onePageUrl + '#' + homeSectionId);
            } else {
                $anchor.attr('href', onePageUrl);
            }
        } else {
            if (typeof splitUrl !== undefined) {
                $anchor.attr('href', onePageUrl + '#' + splitUrl[1]);
            }
            ;
        }
    });

    //one page nav with smoth scroll and active nav
    $('.sp-megamenu-parent, .nav.menu').onePageNav({
        currentClass: 'active',
        changeHash: false,
        scrollSpeed: 1,
        scrollOffset: 30,
        scrollThreshold: 0.5,
        filter: ':not(.no-scroll)'
    });


    // $('.sp-megamenu-wrapper ul li a').click(function(){
    //     $('html, body').animate({
    //         scrollTop: $( $(this).attr('href') ).offset().top
    //     }, 900);
    //     return false;
    // });


    //Slideshow height
    var slideHeight = $(window).height();
    $('.sppb-slider-wrapper.sppb-slider-fullwidth-wrapper .sppb-slideshow-fullwidth-item-bg').css('height', slideHeight);
    $('.sppb-addon-animated-headlines .sppb-addon-animated-headlines-bg').css('height', slideHeight);

    //Slideshow angle down link
    var sppbSecondSectionId = $('#sp-page-builder > .page-content > section:nth-child(2)').attr('id'),
            // pagebuilder second row id
            newAngleDownUrl = '#' + sppbSecondSectionId,
            sppbSlideshowAngle = $(".sppb-slider-wrapper .footer-animation a.slideshow-angle-down-link");
    //has URL
    //sppb_slideshow_angle_url    = sppb_slideshow_angle.attr('href');

    //set url to angle down
    sppbSlideshowAngle.attr("href", newAngleDownUrl);


    // Animation after click
    var clickToSlideClasses = $(".sppb-slider-wrapper .footer-animation a.slideshow-angle-down-link, .sppb-slideshow-fullwidth-read-more");

    clickToSlideClasses.click(function () {
        $('html, body').animate({
            scrollTop: $($.attr(this, 'href')).offset().top
        }, 500);
        return false;
    });





    //Tooltip
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
	var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl);
	});
    
    $(document).on('click', '.sp-rating .star', function (event) {
        event.preventDefault();

        var data = {
            'action': 'voting',
            'user_rating': $(this).data('number'),
            'id': $(this).closest('.post_rating').attr('id')
        };

        var request = {
            'option': 'com_ajax',
            'plugin': 'helix3',
            'data': data,
            'format': 'json'
        };

        $.ajax({
            type: 'POST',
            data: request,
            beforeSend: function () {
                $('.post_rating .ajax-loader').show();
            },
            success: function (response) {
                var data = $.parseJSON(response.data);

                $('.post_rating .ajax-loader').hide();

                if (data.status == 'invalid') {
                    $('.post_rating .voting-result').text('You have already rated this entry!').fadeIn('fast');
                } else if (data.status == 'false') {
                    $('.post_rating .voting-result').text('Somethings wrong here, try again!').fadeIn('fast');
                } else if (data.status == 'true') {
                    var rate = data.action;
                    $('.voting-symbol').find('.star').each(function (i) {
                        if (i < rate) {
                            $(".star").eq(-(i + 1)).addClass('active');
                        }
                    });

                    $('.post_rating .voting-result').text('Thank You!').fadeIn('fast');
                }

            },
            error: function () {
                $('.post_rating .ajax-loader').hide();
                $('.post_rating .voting-result').text('Failed to rate, try again!').fadeIn('fast');
            }
        });
    });


});