Items
Get a single item
path Parameters
item_id
required
string
Responses
200 successful operation
Response Schema: application/json
id	
string <uuid>
Read-only internal id of the item. If included in the POST request it will cause an update instead of a creating a new object.

handle	
string
item_name	
string [ 1 .. 64 ] characters
The item name.

description	
string [ 1 .. 32768 ] characters
The item description.

reference_id	
string <= 128 characters
External reference id for the item

category_id	
string <uuid>
Default: null
The category id of the item

track_stock	
boolean
Default: false
If true, the system tracks inventory for this item at all stores. Make sure you don't accidentally disable track stock. If you set track_stock to false then all inventory levels of this item are set to 0

sold_by_weight	
boolean
Default: false
If true, a fractional quantity for this item can be specified at the time of a sale (for example 1.5)

is_composite	
boolean
If true, the item contains a specified quantity of other items. Learn more

use_production	
boolean
Default: false
If true, the system tracks stock not only for its components but also for this item. This property can be set only for composite items. Learn more

components	
Array of objects (Component)
The list of components for the item. Learn more

primary_supplier_id	
string <uuid>
tax_ids	
Array of strings <uuid>
The list of tax ids applied to this item

modifiers_ids	
Array of strings
The list of modifiers ids applied to this item

form	
string
Default: "SQUARE"
Enum: "SQUARE" "CIRCLE" "SUN" "OCTAGON"
The visual form of the item that is displayed on the POS

color	
string
Default: "GREY"
Enum: "GREY" "RED" "PINK" "ORANGE" "YELLOW" "GREEN" "BLUE" "PURPLE"
One of the predefined colors for the item that is displayed on the POS

image_url	
string
option1_name	
string
The name of the first option (for example "Size"). Learn more

option2_name	
string
The name of the first option (for example "Color"). Learn more

option3_name	
string
The name of the first option (for example "Material"). Learn more

created_at	
string <date-time>
The time when this resource was created (ISO 8601 format, e.g. 2020-03-25T19:55:23.077Z)

updated_at	
string <date-time>
The time when this resource was updated (ISO 8601 format, e.g. 2020-03-30T08:05:10.020Z)

deleted_at	
string <date-time>
The time when this resource was deleted (ISO 8601 format, e.g. 2020-04-02T23:45:20.050Z)

variants	
Array of objects (GETVariant)
get
/items/{item_id}
https://api.loyverse.com/v1.0/items/{item_id}
Response samples
Content type
application/json
Copy
Expand allCollapse all
{
"id": "string",
"handle": "string",
"item_name": "T-shirt",
"description": "string",
"reference_id": "string",
"category_id": null,
"track_stock": false,
"sold_by_weight": false,
"is_composite": true,
"use_production": false,
"components": [
{
"variant_id": "string",
"quantity": 0
}
],
"primary_supplier_id": "string",
"tax_ids": [
"string"
],
"modifiers_ids": [
"string"
],
"form": "SQUARE",
"color": "GREY",
"image_url": "string",
"option1_name": "Size",
"option2_name": "Color",
"option3_name": null,
"created_at": "2020-03-25T19:55:23.077Z",
"updated_at": "2020-03-30T08:05:10.020Z",
"deleted_at": "2020-04-02T23:45:20.050Z",
"variants": [
{
"variant_id": "string",
"item_id": "string",
"sku": "string",
"reference_variant_id": "string",
"option1_value": "Large",
"option2_value": "Green",
"option3_value": null,
"barcode": "string",
"cost": 0,
"purchase_cost": 0,
"default_pricing_type": "VARIABLE",
"default_price": null,
"stores": [],
"created_at": "2020-11-04T00:00:00.000Z",
"updated_at": "2020-11-04T00:00:00.000Z",
"deleted_at": "2020-11-04T00:00:00.000Z"
}
]
}
Delete a single resource
path Parameters
item_id
required
string
Responses
200 successful operation
Response Schema: application/json
deleted_object_ids	
Array of strings
The list of deleted object ids

delete
/items/{item_id}
https://api.loyverse.com/v1.0/items/{item_id}
Response samples
Content type
application/json
Copy
Expand allCollapse all
{
"deleted_object_ids": [
"string"
]
}
Upload a single image
You can download image directly using image/png requests with image data. The following is an example of such an HTTP request:

POST /v1.0/{item_id}/image
Content-Type: image/png
Content-Length: 1000

[file content goes there]
path Parameters
item_id
required
string
Request Body schema: image/png
string <binary>
Responses
201 successful operation
post
/items/{item_id}/image
https://api.loyverse.com/v1.0/items/{item_id}/image
Delete a single image
path Parameters
item_id
required
string
Responses
200 successful operation
Response Schema: application/json
delete
/items/{item_id}/image
https://api.loyverse.com/v1.0/items/{item_id}/image
Response samples
Content type
application/json
Copy
Expand allCollapse all
{ }
Get a list of items
The list of items is sorted by created_at property in descending order. The most recent items appear first

query Parameters
items_ids	
string
Return only items specified by a comma-separated list of IDs

created_at_min	
string <date-time>
Show resources created after date (ISO 8601 format, e.g: 2020-03-30T18:30:00.000Z)

created_at_max	
string <date-time>
Show resources created before date (ISO 8601 format, e.g: 2020-03-30T18:30:00.000Z)

updated_at_min	
string
Show resources updated after date (ISO 8601 format, e.g: 2020-03-30T18:30:00.000Z)

updated_at_max	
string
Show resources updated before date (ISO 8601 format, e.g: 2020-03-30T18:30:00.000Z)

limit	
integer [ 1 .. 250 ]
Default: 50
Used for pagination

cursor	
string
Used for pagination

show_deleted	
boolean
Default: false
Show deleted modifiers and modifier options

Responses
200 successful operation
Response Schema: application/json
items	
Array of objects (GETItem)
cursor	
string
get
/items
https://api.loyverse.com/v1.0/items
Response samples
Content type
application/json
Copy
Expand allCollapse all
{
"items": [
{
"id": "string",
"handle": "string",
"item_name": "T-shirt",
"description": "string",
"reference_id": "string",
"category_id": null,
"track_stock": false,
"sold_by_weight": false,
"is_composite": true,
"use_production": false,
"components": [],
"primary_supplier_id": "string",
"tax_ids": [],
"modifiers_ids": [],
"form": "SQUARE",
"color": "GREY",
"image_url": "string",
"option1_name": "Size",
"option2_name": "Color",
"option3_name": null,
"created_at": "2020-03-25T19:55:23.077Z",
"updated_at": "2020-03-30T08:05:10.020Z",
"deleted_at": "2020-04-02T23:45:20.050Z",
"variants": []
}
],
"cursor": "string"
}
Create or update a single item
Request Body schema: application/json
The item object

id	
string <uuid>
Read-only internal id of the item. If included in the POST request it will cause an update instead of a creating a new object.

item_name
required
string [ 1 .. 64 ] characters
The item name.

description	
string [ 1 .. 32768 ] characters
The item description.

reference_id	
string <= 128 characters
External reference id for the item

category_id	
string <uuid>
Default: null
The category id of the item

track_stock	
boolean
Default: false
If true, the system tracks inventory for this item at all stores. Make sure you don't accidentally disable track stock. If you set track_stock to false then all inventory levels of this item are set to 0

sold_by_weight	
boolean
Default: false
If true, a fractional quantity for this item can be specified at the time of a sale (for example 1.5)

is_composite	
boolean
If true, the item contains a specified quantity of other items. Learn more

use_production	
boolean
Default: false
If true, the system tracks stock not only for its components but also for this item. This property can be set only for composite items. Learn more

components	
Array of objects (Component)
The list of components for the item. Learn more

primary_supplier_id	
string <uuid>
tax_ids	
Array of strings <uuid>
The list of tax ids applied to this item

modifiers_ids	
Array of strings
The list of modifiers ids applied to this item

form	
string
Default: "SQUARE"
Enum: "SQUARE" "CIRCLE" "SUN" "OCTAGON"
The visual form of the item that is displayed on the POS

color	
string
Default: "GREY"
Enum: "GREY" "RED" "PINK" "ORANGE" "YELLOW" "GREEN" "BLUE" "PURPLE"
One of the predefined colors for the item that is displayed on the POS

option1_name	
string
The name of the first option (for example "Size"). Learn more

option2_name	
string
The name of the first option (for example "Color"). Learn more

option3_name	
string
The name of the first option (for example "Material"). Learn more

variants	
Array of objects (POSTVariant)
Responses
200 successful operation
Response Schema: application/json
id	
string <uuid>
Read-only internal id of the item. If included in the POST request it will cause an update instead of a creating a new object.

handle	
string
item_name	
string [ 1 .. 64 ] characters
The item name.

description	
string [ 1 .. 32768 ] characters
The item description.

reference_id	
string <= 128 characters
External reference id for the item

category_id	
string <uuid>
Default: null
The category id of the item

track_stock	
boolean
Default: false
If true, the system tracks inventory for this item at all stores. Make sure you don't accidentally disable track stock. If you set track_stock to false then all inventory levels of this item are set to 0

sold_by_weight	
boolean
Default: false
If true, a fractional quantity for this item can be specified at the time of a sale (for example 1.5)

is_composite	
boolean
If true, the item contains a specified quantity of other items. Learn more

use_production	
boolean
Default: false
If true, the system tracks stock not only for its components but also for this item. This property can be set only for composite items. Learn more

components	
Array of objects (Component)
The list of components for the item. Learn more

primary_supplier_id	
string <uuid>
tax_ids	
Array of strings <uuid>
The list of tax ids applied to this item

modifiers_ids	
Array of strings
The list of modifiers ids applied to this item

form	
string
Default: "SQUARE"
Enum: "SQUARE" "CIRCLE" "SUN" "OCTAGON"
The visual form of the item that is displayed on the POS

color	
string
Default: "GREY"
Enum: "GREY" "RED" "PINK" "ORANGE" "YELLOW" "GREEN" "BLUE" "PURPLE"
One of the predefined colors for the item that is displayed on the POS

image_url	
string
option1_name	
string
The name of the first option (for example "Size"). Learn more

option2_name	
string
The name of the first option (for example "Color"). Learn more

option3_name	
string
The name of the first option (for example "Material"). Learn more

created_at	
string <date-time>
The time when this resource was created (ISO 8601 format, e.g. 2020-03-25T19:55:23.077Z)

updated_at	
string <date-time>
The time when this resource was updated (ISO 8601 format, e.g. 2020-03-30T08:05:10.020Z)

deleted_at	
string <date-time>
The time when this resource was deleted (ISO 8601 format, e.g. 2020-04-02T23:45:20.050Z)

variants	
Array of objects (GETVariant)
