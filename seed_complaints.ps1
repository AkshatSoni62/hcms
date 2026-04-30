$baseUrl = "http://localhost:8081/api"
$userId = 5 # patient@hcms.local

$complaints = @(
    @{
        title = "Bed linens not changed"
        description = "The bed linens in room 302 haven't been changed for two days."
        category = "Room Hygiene"
        severity = "Medium"
        hospitalLocation = "City General"
    },
    @{
        title = "Leaking tap in bathroom"
        description = "The tap in the 3rd floor west wing bathroom is leaking constantly."
        category = "Bathroom / Toilet Issues"
        severity = "Low"
        hospitalLocation = "Sunrise Hospital"
    },
    @{
        title = "Recurring power cuts"
        description = "Electricity is flickering in ward B, causing medical equipment alarms to trigger."
        category = "Electricity Problems"
        severity = "High"
        hospitalLocation = "City General"
    },
    @{
        title = "No hot water in the morning"
        description = "Patients are complaining about cold water during morning showers."
        category = "Water Supply Issues"
        severity = "Medium"
        hospitalLocation = "City General"
    },
    @{
        title = "Poor signal in the ward"
        description = "WiFi connection is extremely slow and disconnects frequently in the patient rooms."
        category = "Internet / WiFi Problems"
        severity = "Low"
        hospitalLocation = "Metro Clinic"
    },
    @{
        title = "Food served cold"
        description = "Lunch was delivered cold again today. This happens quite often."
        category = "Mess / Food Issues"
        severity = "Medium"
        hospitalLocation = "Healing Hands"
    },
    @{
        title = "Broken chair in the waiting room"
        description = "There is a chair with a broken leg in the main reception area, it's a safety hazard."
        category = "Furniture / Room Damage"
        severity = "Medium"
        hospitalLocation = "City General"
    },
    @{
        title = "Loud repairs at night"
        description = "Construction work is happening near the ICU at 2 AM, disturbing patients."
        category = "Noise / Disturbance"
        severity = "High"
        hospitalLocation = "City General"
    },
    @{
        title = "Unidentified person in restricted area"
        description = "I saw someone without a badge wandering around the pharmacy storage."
        category = "Security Issues"
        severity = "Critical"
        hospitalLocation = "City General"
    },
    @{
        title = "General suggestion for better signage"
        description = "It's hard to find the laboratory from the main entrance. More signs are needed."
        category = "Other Complaints"
        severity = "Low"
        hospitalLocation = "Universal Medical"
    }
)

foreach ($c in $complaints) {
    $json = $c | ConvertTo-Json
    Write-Host "Seeding: $($c.title) ($($c.category))"
    Invoke-WebRequest -Uri "$baseUrl/complaints?userId=$userId" -Method POST -ContentType "application/json" -Body $json -UseBasicParsing
}

Write-Host "Seeding complete!"
