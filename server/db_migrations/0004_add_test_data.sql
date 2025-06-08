INSERT INTO feature (name, age, gender, location) VALUES
('Dodoma', 2, 'female', ST_GeomFromText('POINT(35.7796 -6.1630)', 3067)), -- Dodoma, Tanzania
('Niassa', 3, 'male', ST_GeomFromText('POINT(37.2692 -13.2543)', 3067)), -- Niassa, Mozambique
('West Sahara', 5, 'male', ST_GeomFromText('POINT(-13.0033 25.0000)', 3067)), -- Western Sahara
('Palestine', 1, 'female', ST_GeomFromText('POINT(35.2033 31.9522)', 3067)), -- Palestine
('Sulawesi', 4, 'unknown', ST_GeomFromText('POINT(121.0794 -2.1115)', 3067)); -- Sulawesi, Indonesia

