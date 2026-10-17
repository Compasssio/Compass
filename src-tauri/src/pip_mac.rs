#![cfg(target_os = "macos")]

use objc2::msg_send;
use objc2::runtime::AnyObject;
use objc2_app_kit::NSWindow;

const CAN_JOIN_ALL_SPACES: usize = 1 << 0;
const MANAGED: usize = 1 << 2;
const STATIONARY: usize = 1 << 4;
const FULL_SCREEN_PRIMARY: usize = 1 << 7;
const FULL_SCREEN_AUXILIARY: usize = 1 << 8;

const LEVEL_NORMAL: isize = 0;
const LEVEL_FLOATING: isize = 3;

pub fn enter_pip_window(ns_window_ptr: i64) {
    if ns_window_ptr == 0 {
        return;
    }
    unsafe {
        let raw: *mut AnyObject = ns_window_ptr as *mut AnyObject;
        let win: &NSWindow = &*(raw as *const NSWindow);
        let behavior: usize = CAN_JOIN_ALL_SPACES | FULL_SCREEN_AUXILIARY | STATIONARY;
        let _: () = msg_send![win, setCollectionBehavior: behavior];
        let _: () = msg_send![win, setLevel: LEVEL_FLOATING];
    }
}

pub fn exit_pip_window(ns_window_ptr: i64) {
    if ns_window_ptr == 0 {
        return;
    }
    unsafe {
        let raw: *mut AnyObject = ns_window_ptr as *mut AnyObject;
        let win: &NSWindow = &*(raw as *const NSWindow);
        let behavior: usize = FULL_SCREEN_PRIMARY | MANAGED;
        let _: () = msg_send![win, setCollectionBehavior: behavior];
        let _: () = msg_send![win, setLevel: LEVEL_NORMAL];
    }
}
