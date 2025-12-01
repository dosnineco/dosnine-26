#!/usr/bin/env python3
import re
import html
from pathlib import Path

IN_FILE = Path(__file__).parent / 'property_html_full.html'
OUT_FILE = Path(__file__).parent.parent / 'property_imports_more.sql'
OWNER_ID = '9db9b7aa-47f9-419b-9f2d-9e4c4fd91248'

def slugify(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s

def extract_listings(html_text):
    parts = html_text.split('<div class="col-lg-4 col-md-6 col-12 property_list_colm">')
    listings = []
    for part in parts[1:]:
        block = part
        href = re.search(r'href="([^"]+)"', block)
        img = re.search(r'<img[^>]+src="([^"]+)"', block)
        agent = re.search(r'<h3 class="agnt_name">\s*([^<]+?)\s*<', block)
        phone = re.search(r'<h4 class="agnt_mob">\s*([^<]+?)\s*<', block)
        town = re.search(r'<span class="txts">\s*([^<]+?)\s*<', block)
        title_main = re.search(r'<h3 class="title">\s*([^<]+?)\s*<', block)
        typespan = re.search(r'<span class="typespan">\s*([^<]+?)\s*<', block)
        price = re.search(r'JMD\s*\$?([\d,]+)', block)
        mls = re.search(r'(MLS-\d+)', block)
        desc = re.search(r'<p class="propdesc">\s*([^<]+?)\s*<', block)
        beds = re.search(r'class="beds_li"[\s\S]*?<span class="counts">\s*(\d+)', block)
        baths = re.search(r'class="baths_li"[\s\S]*?<span class="counts">\s*(\d+)', block)
        area = re.search(r'class="size_li"[\s\S]*?<span class="counts">\s*([\d,]+)\s*SqFt', block)
        status_badge = re.search(r'<span class="contract_badge">\s*([^<]*?)\s*<', block)

        listing = {
            'href': href.group(1).strip() if href else None,
            'img': img.group(1).strip() if img else None,
            'agent': agent.group(1).strip() if agent else None,
            'phone': phone.group(1).strip() if phone else None,
            'town': town.group(1).strip() if town else None,
            'title_main': title_main.group(1).strip() if title_main else None,
            'typespan': typespan.group(1).strip() if typespan else None,
            'price': price.group(1).replace(',', '') if price else None,
            'mls': mls.group(1).strip() if mls else None,
            'desc': desc.group(1).strip() if desc else None,
            'beds': int(beds.group(1)) if beds else None,
            'baths': int(baths.group(1)) if baths else None,
            'area': int(area.group(1).replace(',', '')) if area else None,
            'status_badge': status_badge.group(1).strip() if status_badge else None,
        }
        listings.append(listing)
    return listings

def sql_escape(s):
    if s is None:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"

def gen_insert(listing):
    title = (listing['title_main'] or '').strip()
    if listing.get('typespan'):
        title = f"{title} {listing['typespan']}".strip()
    parish = None
    town = None
    if listing.get('town'):
        # split on comma
        parts = listing['town'].split(',')
        if len(parts) == 2:
            parish = parts[0].strip()
            town = parts[1].strip()
        else:
            # if single part, set town
            if ',' in listing['town']:
                parish = listing['town'].strip()
            else:
                town = listing['town'].strip()

    mls_digits = listing['mls'] if listing.get('mls') else 'no-mls'
    slug = slugify(f"{title} {town or ''} {mls_digits}")

    desc = listing.get('desc') or ''
    price = listing.get('price')
    price_val = price if price else 'NULL'
    prop_type = 'rent'
    t = (listing.get('title_main') or '').lower()
    if 'commercial' in t:
        prop_type = 'commercial'
    elif 'apartment' in t:
        prop_type = 'apartment'
    elif 'house' in t:
        prop_type = 'house'

    status = 'available'
    badge = (listing.get('status_badge') or '').lower()
    if 'under contract' in badge:
        status = 'under_contract'
    if 'under offer' in badge:
        status = 'under_offer'

    beds = listing.get('beds')
    baths = listing.get('baths')
    img = listing.get('img')
    phone = listing.get('phone')

    cols = [
        f"'{OWNER_ID}'",
        sql_escape(title),
        sql_escape(slug),
        sql_escape(desc),
        sql_escape(parish) if parish else 'NULL',
        sql_escape(town) if town else 'NULL',
        'NULL',
        price_val if price_val != 'NULL' else 'NULL',
        sql_escape('JMD'),
        sql_escape(prop_type),
        str(beds) if beds is not None else 'NULL',
        str(baths) if baths is not None else 'NULL',
        sql_escape(status),
        'false',
        '0',
        'NULL',
        'now()',
        'now()',
        f"ARRAY['{img}']" if img else 'NULL',
        sql_escape(phone) if phone else 'NULL'
    ]

    insert = 'INSERT INTO public.properties (owner_id, title, slug, description, parish, town, address, price, currency, type, bedrooms, bathrooms, status, is_featured, views, available_date, created_at, updated_at, image_urls, phone_number)\nVALUES\n(' + ', '.join(cols) + ');\n'
    return insert

def main():
    txt = IN_FILE.read_text(encoding='utf-8')
    listings = extract_listings(txt)
    if not listings:
        print('No listings found.')
        return
    out = []
    for l in listings:
        out.append(gen_insert(l))

    OUT_FILE.write_text('-- Generated inserts from HTML\n' + '\n'.join(out), encoding='utf-8')
    print(f'Wrote {len(out)} inserts to {OUT_FILE}')

if __name__ == '__main__':
    main()
