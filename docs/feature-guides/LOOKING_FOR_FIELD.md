# Looking For Field - Code to Add

## 1. Add to constants (after LANGUAGES, around line 68):

```typescript
// What are you looking for?
const LOOKING_FOR = [
  "💕 Dating",
  "👫 Looking for Friends",
  "🎉 Fun & Casual",
  "💍 Long-term Relationship"
];
```

## 2. Remove from INTERESTS array (line 29-30):
Remove this line:
```
  // Relationship Goals
  "💕 Dating", "👫 Looking for Friends", "🎉 Fun & Casual", "💍 To Marry",
```

## 3. Add to formData state (line 151, after bio:):
```typescript
    looking_for: [] as string[],
```

## 4. Add to fetchProfile data loading (line 207, after bio:):
```typescript
          looking_for: Array.isArray(data.looking_for) ? data.looking_for : [],
```

## 5. Add to profileUpdateSchema (line 119, after bio:):
```typescript
  looking_for: z.array(z.string()).optional().nullable(),
```

## 6. Add to profileData object (line 460, after bio:):
```typescript
        looking_for: formData.looking_for || [],
```

## 7. Add UI field BEFORE Interests field (insert around line 794, after Bio field):

```typescript
                <div className="space-y-2">
                  <Label htmlFor="looking_for">Looking For</Label>
                  <div className="space-y-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.looking_for.includes(value)) {
                          setFormData({ ...formData, looking_for: [...formData.looking_for, value] });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="What are you looking for?" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOOKING_FOR.map((option) => (
                          <SelectItem 
                            key={option} 
                            value={option}
                            disabled={formData.looking_for.includes(option)}
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {formData.looking_for.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.looking_for.map((item) => (
                          <Badge key={item} variant="default" className="gap-1">
                            {item}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => setFormData({ 
                                ...formData, 
                                looking_for: formData.looking_for.filter(i => i !== item) 
                              })}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
```

## 8. Update Preview Dialog - Add looking_for display (around line 1088, after Bio section):

```typescript
                  {/* Looking For */}
                  {profile.looking_for && profile.looking_for.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">💕 Looking For</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.looking_for.map((item, index) => (
                          <Badge key={index} variant="default">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
```

## Database Migration:

Run this in Supabase SQL Editor:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';
```
