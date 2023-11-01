<?php
/**
 * Plugin Name: Performance Lab Disable Modules
 * Description: Disable all Performance Lab modules.
 * Version: 0.1.0
 * Author: Pascal Birchler
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 */

add_filter( 'pre_option_perflab_modules_settings', '__return_empty_array' );
