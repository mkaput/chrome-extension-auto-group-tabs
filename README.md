# Auto group tabs (Chrome Extension)

[![CI](https://github.com/mkaput/chrome-extension-auto-group-tabs/actions/workflows/ci.yml/badge.svg)](https://github.com/mkaput/chrome-extension-auto-group-tabs/actions/workflows/ci.yml)

This extension provides an action that groups ungrouped tabs of given window into groups with common
hostname.

Maintains following properties:

1. Only ungrouped and unpinned tabs are processed.
1. Only `http://` or `https://` tabs are processed.
1. Strips `www.` prefixes and other noise from hostnames (whenever makes sense).
1. If at least 50% of tabs in an existing tab group share single hostname, will assign any free tabs
   to this group.
1. Otherwise, ignores any other existing tab groups.
1. If there are multiple existing groups fulfilling processing condition, tabs will be added to
   the **last** tab group.
