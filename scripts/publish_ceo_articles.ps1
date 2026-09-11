# Pure ASCII PowerShell script to publish all 10 CEO & SEO articles
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJzdXBlcmFkbWluIiwidHlwZSI6ImFkbWluIiwiaWF0IjoxNzg5MDQ3NjQxLCJleHAiOjE3ODk2NTI0NDF9.q3xhfy10omYfn3G7uc-ks3XAfdyHCnMCwdZ-7kjbxcs"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
}

Write-Host "Loading JSON metadata and CTA..."
$metaPath = "c:\repos\zakariaprom\scripts\articles_metadata.json"
$ctaPath  = "c:\repos\zakariaprom\scripts\articles_cta.md"
$meta = Get-Content -Raw -Encoding UTF8 $metaPath | ConvertFrom-Json
$cta  = Get-Content -Raw -Encoding UTF8 $ctaPath

Write-Host "Fetching raw posts from live API..."
$posts = Invoke-RestMethod -Uri "https://zakariaprom.com/api/posts"
$p7 = ($posts | Where-Object { $_.id -eq 7 }).content_ar
if (-not $p7) {
    Write-Error "Post 7 not found!"
    exit 1
}

$chunks = $p7 -split "---"
$chunkIndices = @(0, 2, 3, 4, 5, 6, 7, 9, 10, 11)
$targetIds = @(3, 4, 5, 6, 7)

# Arabic keyword "Al-Maraje'" constructed via unicode codepoints
$refWord = [string]::Concat([char]0x0627, [char]0x0644, [char]0x0645, [char]0x0631, [char]0x0627, [char]0x062c, [char]0x0639)

for ($i = 0; $i -lt 10; $i++) {
    $idx = $chunkIndices[$i]
    $m = $meta[$i]
    $raw = $chunks[$idx].Trim()

    # Clean academic citation markers [1], [2], [1] [2] [3]
    $cleaned = [regex]::Replace($raw, "\[\d+\](\s*\[\d+\])*", "")

    # Clean trailing bibliography
    $refIdx = $cleaned.IndexOf($refWord)
    if ($refIdx -gt -1) {
        $cleaned = $cleaned.Substring(0, $refIdx).Trim()
    }

    # Clean raw header prefix
    $lines = $cleaned -split "`n"
    $filteredLines = @()
    $foundTitle = $false
    foreach ($l in $lines) {
        $lt = $l.Trim()
        if (-not $foundTitle -and ($lt.StartsWith("#") -or $lt.Length -lt 40)) {
            # skip raw short title or prefix lines
            if ($lt -match "zakariaprom" -or $lt -match "^#") {
                continue
            }
        }
        $filteredLines += $l
    }
    $cleaned = $filteredLines -join "`n"

    # Assemble CEO Executive Box
    $ceoBoxTitle = [string]::Concat("## ", [char]0x1F4CC, " ", [char]0x0645, [char]0x0644, [char]0x062e, [char]0x0635, " ", [char]0x062a, [char]0x0646, [char]0x0641, [char]0x064a, [char]0x0630, [char]0x064a, " ", [char]0x0644, [char]0x0635, [char]0x0646, [char]0x0627, [char]0x0639, " ", [char]0x0627, [char]0x0644, [char]0x0642, [char]0x0631, [char]0x0627, [char]0x0631, " (Executive Summary)")
    $ceoBox = "$ceoBoxTitle`n" + $m.ceo_summary + "`n`n---`n"
    $fullContentAr = $ceoBox + $cleaned + "`n`n" + $cta

    $contentTr = $m.summary_tr + "`n`nDetayli bilgi, kurumsal toptan teklif ve numune talepleri icin bizimle iletisime gecin: WhatsApp +905383564552 | zakariaprom.com"
    $contentEn = $m.summary_en + "`n`nFor corporate inquiries, volume discounts, and custom wholesale quotes, contact our team via WhatsApp at +905383564552 or visit zakariaprom.com"

    $postBody = @{
        title_ar    = $m.title_ar
        title_tr    = $m.title_tr
        title_en    = $m.title_en
        content_ar  = $fullContentAr
        content_tr  = $contentTr
        content_en  = $contentEn
        image       = $m.image
        published   = 1
    }

    $jsonStr = $postBody | ConvertTo-Json -Depth 5
    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)

    if ($i -lt 5) {
        $id = $targetIds[$i]
        Write-Host "Updating Post ID $id : ($($m.title_en))..."
        $uri = "https://zakariaprom.com/api/admin/posts/$id"
        $res = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $jsonBytes
        Write-Host "  Success: $($res.success)"
    } else {
        Write-Host "Creating Post $($i+1) : ($($m.title_en))..."
        $uri = "https://zakariaprom.com/api/admin/posts"
        $res = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $jsonBytes
        Write-Host "  Success: $($res.success) (ID: $($res.id))"
    }
}

Write-Host "`nAll 10 CEO articles published successfully to zakariaprom.com!"
