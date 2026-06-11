// Script to drop the problematic unique index
// Run with: mongosh "mongodb://localhost:27017/bidadiemhen" dropIndex.js
db.attendances.dropIndex("user_1_date_1")
print("Index user_1_date_1 dropped successfully")
