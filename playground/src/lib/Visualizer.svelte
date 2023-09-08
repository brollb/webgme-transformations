<script lang="ts">
  import { Node, Svelvet, Group } from 'svelvet';
</script>

<Svelvet minimap={true}>
  <Node bgColor="red" label="Default Node" />
  <Node bgColor="blue" label="Other Node" position={{x: 100, y:100}}/>
  <Group groupName="Pattern" width={500} position={{x: 200, y: 200}} height={500}>
    <Node bgColor="green" label="Node" position={{x: 10, y:10}} />
    <Node bgColor="yellow" label="Node" position={{x: 100, y:100}}/>
  </Group>
</Svelvet>
